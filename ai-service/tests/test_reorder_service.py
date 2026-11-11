"""Reorder (recommendation) service tests: decision and supply logic working together."""
from datetime import date

import pytest

from app.services.incoming_stock_logic import PurchaseOrderLine as L
from app.services.reorder_service import (
    ACTION_EXPEDITE,
    ACTION_NONE,
    ACTION_REORDER,
    ForecastPoint,
    ReorderInput,
    recommend_reorder,
)

TODAY = date(2026, 11, 5)
# ~11 units/day, 95% interval 6..14 -> daily sigma ~ 1.5
FORECAST = [ForecastPoint(10 + (i % 3), 6, 14) for i in range(14)]


def make(**kw) -> ReorderInput:
    base = dict(
        product_id=1, warehouse_id=1, as_of=TODAY, on_hand=400, forecast=FORECAST,
        supplier_lead_time_days=7, supplier_reliability=0.9,
    )
    base.update(kw)
    return ReorderInput(**base)


def po(status="SENT", qty=200, received=0, due=date(2026, 11, 8), product=1, wh=1, po_id=1):
    return L(po_id, product, wh, status, qty, received, due, f"PO-{po_id}")


# ----------------------------------------------------------------- core scenarios
def test_healthy_stock_needs_no_action():
    r = recommend_reorder(make(on_hand=400))
    assert (r.action, r.should_reorder, r.recommended_quantity) == (ACTION_NONE, False, 0)
    assert r.urgency_level == "LOW" and r.shortage_risk == "LOW" and r.reasons == []


def test_low_stock_triggers_reorder_with_quantity_and_urgency():
    r = recommend_reorder(make(on_hand=60))
    assert r.action == ACTION_REORDER and r.should_reorder
    assert r.recommended_quantity > 0
    assert r.shortage_risk == "HIGH" and r.urgency_level == "CRITICAL"  # cover < lead time
    assert r.suggested_order_date == TODAY
    assert r.days_until_stockout is not None


def test_recommended_quantity_brings_position_up_to_target():
    r = recommend_reorder(make(on_hand=60))
    assert r.inventory_position + r.recommended_quantity >= r.target_stock
    assert r.target_stock > r.reorder_point


def test_reorder_point_matches_formula():
    r = recommend_reorder(make(on_hand=60))
    assert r.reorder_point == pytest.approx(r.avg_daily_demand * r.lead_time_days + r.safety_stock, abs=1)


# ------------------------------------------------------------ incoming stock logic
def test_open_purchase_order_prevents_double_ordering():
    without = recommend_reorder(make(on_hand=60))
    with_po = recommend_reorder(make(on_hand=60, po_lines=[po(qty=200, due=date(2026, 11, 8))]))
    assert with_po.incoming_stock == 200
    assert with_po.recommended_quantity < without.recommended_quantity
    assert with_po.action == ACTION_NONE


def test_draft_po_is_not_counted():
    r = recommend_reorder(make(on_hand=60, po_lines=[po(status="DRAFT")]))
    assert r.incoming_stock == 0 and r.assumptions["draft_po_qty_excluded"] == 200


def test_po_for_another_warehouse_is_ignored():
    r = recommend_reorder(make(on_hand=60, po_lines=[po(wh=2)]))
    assert r.incoming_stock == 0


def test_late_purchase_order_means_expedite_not_new_order():
    # 200 units are on order (position is fine) but arrive after the stock has run out
    r = recommend_reorder(make(on_hand=40, po_lines=[po(due=date(2026, 11, 20))]))
    assert r.incoming_stock == 200
    assert r.action == ACTION_EXPEDITE and r.recommended_quantity == 0
    assert r.shortage_risk == "HIGH"
    assert r.suggested_order_date == TODAY  # a late PO must not postpone action
    assert r.days_late > 0
    assert any("not expected to arrive" in x for x in r.reasons)


def test_overdue_purchase_order_is_flagged_and_not_trusted():
    r = recommend_reorder(make(on_hand=40, po_lines=[po(due=date(2026, 11, 1))]))
    assert r.assumptions["overdue_po_qty"] == 200
    assert r.shortage_risk == "HIGH"
    assert any("overdue" in w for w in r.warnings)


# ---------------------------------------------------------------- lead time logic
def test_slower_supplier_raises_safety_stock_reorder_point_and_quantity():
    fast = recommend_reorder(make(on_hand=150, supplier_lead_time_days=3))
    slow = recommend_reorder(make(on_hand=150, supplier_lead_time_days=14))
    assert slow.reorder_point > fast.reorder_point
    assert slow.safety_stock >= fast.safety_stock
    assert slow.target_stock > fast.target_stock


def test_unreliable_supplier_needs_more_safety_stock():
    good = recommend_reorder(make(supplier_reliability=1.0))
    bad = recommend_reorder(make(supplier_reliability=0.5))
    assert bad.safety_stock > good.safety_stock and bad.lead_time_std_days > 0


def test_observed_lead_times_are_preferred_over_supplier_default():
    r = recommend_reorder(make(supplier_lead_time_days=5, observed_lead_times=[9, 10, 11]))
    assert r.lead_time_source == "observed" and r.lead_time_days == 10


# ------------------------------------------------------------------ stock & limits
def test_reserved_stock_is_not_available_for_sale():
    free = recommend_reorder(make(on_hand=200))
    held = recommend_reorder(make(on_hand=200, reserved=150))
    assert held.available_stock == 50 and held.current_stock == 200
    assert held.should_reorder and not free.should_reorder


def test_reserved_can_be_ignored_on_request():
    r = recommend_reorder(make(on_hand=200, reserved=150, use_available_stock=False))
    assert r.available_stock == 200


def test_reserved_above_on_hand_is_clamped_with_warning():
    r = recommend_reorder(make(on_hand=10, reserved=30))
    assert r.available_stock == 0 and any("Reserved" in w for w in r.warnings)


def test_max_stock_level_caps_the_quantity():
    r = recommend_reorder(make(on_hand=60, max_stock_level=150))
    assert r.inventory_position + r.recommended_quantity <= 150


def test_moq_and_pack_size_are_respected():
    r = recommend_reorder(make(on_hand=60, moq=50, order_multiple=24))
    assert r.recommended_quantity % 24 == 0 and r.recommended_quantity >= 50


def test_min_stock_level_alone_can_trigger_reorder():
    r = recommend_reorder(make(on_hand=250, min_stock_level=300))
    assert r.should_reorder and any("minimum stock level" in x for x in r.reasons)


def test_out_of_stock_is_critical():
    r = recommend_reorder(make(on_hand=0))
    assert r.urgency_level == "CRITICAL" and r.shortage_risk == "HIGH" and r.days_until_stockout == 1


# -------------------------------------------------------- demand / forecast handling
def test_forecast_without_intervals_warns_and_uses_zero_uncertainty():
    flat = [ForecastPoint(11.0) for _ in range(14)]
    r = recommend_reorder(make(forecast=flat))
    assert r.demand_std == 0 and r.assumptions["demand_std_source"] == "none"
    assert any("confidence interval" in w for w in r.warnings)


def test_demand_std_is_derived_from_forecast_interval():
    r = recommend_reorder(make())
    assert r.assumptions["demand_std_source"] == "forecast_interval"
    assert 1.0 < r.demand_std < 2.5  # (14 - ~11) / 1.96


def test_demand_std_override_wins():
    r = recommend_reorder(make(demand_std_override=5))
    assert r.demand_std == 5 and r.assumptions["demand_std_source"] == "override"


def test_wider_forecast_interval_gives_more_safety_stock():
    narrow = recommend_reorder(make(forecast=[ForecastPoint(11, 10, 12)] * 14))
    wide = recommend_reorder(make(forecast=[ForecastPoint(11, 2, 20)] * 14))
    assert wide.safety_stock > narrow.safety_stock


def test_short_forecast_warns_that_demand_is_extrapolated():
    r = recommend_reorder(make(forecast=FORECAST[:3]))
    assert any("extrapolated" in w for w in r.warnings)


def test_zero_demand_product_is_not_reordered_when_stock_exists():
    r = recommend_reorder(make(forecast=[ForecastPoint(0.0)] * 7, on_hand=20))
    assert r.action == ACTION_NONE and r.suggested_order_date is None


# ------------------------------------------------------------------- output & input
def test_urgency_is_a_valid_database_value():
    for stock in (0, 60, 150, 400):
        assert recommend_reorder(make(on_hand=stock)).urgency_level in {"LOW", "MEDIUM", "HIGH", "CRITICAL"}


def test_to_dict_is_json_serialisable():
    import json
    d = recommend_reorder(make(on_hand=60)).to_dict()
    json.dumps(d)
    assert d["as_of"] == "2026-11-05" and d["suggested_order_date"] == "2026-11-05"


def test_result_is_deterministic():
    assert recommend_reorder(make(on_hand=60)) == recommend_reorder(make(on_hand=60))


@pytest.mark.parametrize(
    "kw",
    [dict(forecast=[]), dict(on_hand=-1), dict(reserved=-1), dict(demand_std_override=-1),
     dict(forecast=[ForecastPoint(-1.0)]), dict(forecast_confidence_level=1.2), dict(review_period_days=-1)],
)
def test_invalid_input_is_rejected(kw):
    with pytest.raises(ValueError):
        recommend_reorder(make(**kw))


# ------------------------------------------------------ forecast (AI #1) -> reorder (AI #2)
def test_end_to_end_with_real_forecast_output():
    """Feed the actual AI #1 service output into AI #2."""
    from app.schemas.forecast import DemandForecastRequest, HistoricalDataPoint
    from app.services.forecast_service import ForecastService

    history = [HistoricalDataPoint(date=f"2026-10-{d:02d}", quantity=18 + (d % 7)) for d in range(1, 32)]
    fc = ForecastService().generate_forecast(
        DemandForecastRequest(product_id=1, horizon_days=14, start_date="2026-11-01", historical_data=history)
    )
    assert fc.history_source == "provided"
    points = [ForecastPoint(p.predicted_demand, p.lower_bound, p.upper_bound) for p in fc.predictions]

    rec = recommend_reorder(make(forecast=points, on_hand=80))
    assert rec.avg_daily_demand > 0 and rec.demand_std > 0
    assert rec.action in {ACTION_REORDER, ACTION_EXPEDITE, ACTION_NONE}
    assert rec.should_reorder and rec.recommended_quantity > 0  # 80 units vs ~20/day over a 7-day lead time

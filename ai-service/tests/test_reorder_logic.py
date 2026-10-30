"""Sprint9-04 - Reorder scenario tests for app.services.reorder_logic."""
import pytest

from app.services.reorder_logic import (
    URGENCY_CRITICAL,
    URGENCY_HIGH,
    URGENCY_MEDIUM,
    URGENCY_NONE,
    calculate_recommended_quantity,
    calculate_reorder_point,
    calculate_safety_stock,
    decide_reorder,
    z_score_for_service_level,
)


# ---------------------------------------------------------------- safety stock
class TestSafetyStock:
    def test_z_score_known_values(self):
        assert z_score_for_service_level(0.5) == pytest.approx(0.0)
        assert z_score_for_service_level(0.95) == pytest.approx(1.6449, abs=1e-3)

    @pytest.mark.parametrize("level", [0.4, 1.0, 1.5])
    def test_z_score_invalid_level(self, level):
        with pytest.raises(ValueError):
            z_score_for_service_level(level)

    def test_fixed_days(self):
        r = calculate_safety_stock(
            avg_daily_demand=10, lead_time_days=7, method="fixed_days", fixed_days=3
        )
        assert r.safety_stock == 30

    def test_max_min(self):
        r = calculate_safety_stock(
            avg_daily_demand=10,
            lead_time_days=7,
            method="max_min",
            max_daily_demand=15,
            max_lead_time_days=10,
        )
        assert r.safety_stock == 80  # 15*10 - 10*7

    def test_max_min_never_negative(self):
        r = calculate_safety_stock(
            avg_daily_demand=10,
            lead_time_days=7,
            method="max_min",
            max_daily_demand=5,
            max_lead_time_days=5,
        )
        assert r.safety_stock == 0

    def test_statistical(self):
        # sqrt(4 * 2^2) = 4 ; 1.6449 * 4 = 6.58 -> ceil 7
        r = calculate_safety_stock(
            avg_daily_demand=10, lead_time_days=4, demand_std=2, service_level=0.95
        )
        assert r.safety_stock == 7
        assert r.method == "statistical"

    def test_statistical_zero_variability(self):
        r = calculate_safety_stock(avg_daily_demand=10, lead_time_days=4)
        assert r.safety_stock == 0

    def test_higher_service_level_gives_more_safety_stock(self):
        kw = dict(avg_daily_demand=20, lead_time_days=9, demand_std=5)
        low = calculate_safety_stock(service_level=0.90, **kw).safety_stock
        high = calculate_safety_stock(service_level=0.99, **kw).safety_stock
        assert high > low

    def test_invalid_method(self):
        with pytest.raises(ValueError):
            calculate_safety_stock(avg_daily_demand=1, lead_time_days=1, method="bogus")

    def test_negative_inputs(self):
        with pytest.raises(ValueError):
            calculate_safety_stock(avg_daily_demand=-1, lead_time_days=1)


# ----------------------------------------------------------------- reorder point
def test_reorder_point():
    assert calculate_reorder_point(10, 5, 20) == 70
    assert calculate_reorder_point(2.5, 3, 1) == 9  # 8.5 -> 9


# --------------------------------------------------------------- reorder decision
class TestDecideReorder:
    base = dict(avg_daily_demand=10, lead_time_days=5, safety_stock=20)  # ROP = 70

    def test_no_reorder_when_stock_sufficient(self):
        d = decide_reorder(on_hand=100, on_order=0, **self.base)
        assert d.should_reorder is False
        assert d.urgency == URGENCY_NONE
        assert d.reorder_point == 70
        assert d.reasons == []

    def test_reorder_at_exact_reorder_point(self):
        d = decide_reorder(on_hand=70, on_order=0, **self.base)
        assert d.should_reorder is True

    def test_medium_urgency(self):
        d = decide_reorder(on_hand=60, on_order=0, **self.base)
        assert d.should_reorder is True
        assert d.urgency == URGENCY_MEDIUM
        assert d.days_of_cover == 6.0

    def test_high_urgency_within_safety_stock(self):
        d = decide_reorder(
            on_hand=15, on_order=0, avg_daily_demand=5, lead_time_days=2, safety_stock=20
        )
        assert d.urgency == URGENCY_HIGH

    def test_critical_out_of_stock(self):
        d = decide_reorder(on_hand=0, on_order=0, **self.base)
        assert d.urgency == URGENCY_CRITICAL
        assert "Out of stock" in d.reasons

    def test_critical_cover_shorter_than_lead_time(self):
        d = decide_reorder(
            on_hand=20, on_order=0, avg_daily_demand=10, lead_time_days=5, safety_stock=30
        )
        assert d.days_of_cover == 2.0
        assert d.urgency == URGENCY_CRITICAL

    def test_on_order_prevents_reorder(self):
        d = decide_reorder(on_hand=30, on_order=100, **self.base)
        assert d.should_reorder is False
        assert d.inventory_position == 130

    def test_min_stock_level_triggers_reorder(self):
        d = decide_reorder(on_hand=90, on_order=0, min_stock_level=100, **self.base)
        assert d.should_reorder is True
        assert any("minimum stock level" in r for r in d.reasons)

    def test_zero_demand(self):
        d = decide_reorder(
            on_hand=0, on_order=0, avg_daily_demand=0, lead_time_days=5, safety_stock=0
        )
        assert d.days_of_cover is None
        assert d.should_reorder is True
        assert d.urgency == URGENCY_CRITICAL


# -------------------------------------------------------- recommended quantity
class TestRecommendedQuantity:
    base = dict(avg_daily_demand=10, lead_time_days=5, safety_stock=20)  # target = 140

    def test_basic_quantity(self):
        q = calculate_recommended_quantity(on_hand=60, on_order=0, **self.base)
        assert q.target_stock == 140
        assert q.recommended_quantity == 80
        assert not q.capped_by_max_stock and not q.adjusted_for_moq

    def test_no_quantity_when_stock_above_target(self):
        q = calculate_recommended_quantity(on_hand=150, on_order=0, **self.base)
        assert q.recommended_quantity == 0

    def test_on_order_is_subtracted(self):
        q = calculate_recommended_quantity(on_hand=60, on_order=80, **self.base)
        assert q.recommended_quantity == 0

    def test_moq_raises_small_quantity(self):
        q = calculate_recommended_quantity(on_hand=135, on_order=0, moq=20, **self.base)
        assert q.raw_quantity == 5
        assert q.recommended_quantity == 20
        assert q.adjusted_for_moq

    def test_order_multiple_rounds_up(self):
        q = calculate_recommended_quantity(on_hand=60, on_order=0, order_multiple=12, **self.base)
        assert q.recommended_quantity == 84
        assert q.adjusted_for_moq

    def test_max_stock_caps_target(self):
        q = calculate_recommended_quantity(on_hand=60, on_order=0, max_stock_level=100, **self.base)
        assert q.target_stock == 100
        assert q.recommended_quantity == 40
        assert q.capped_by_max_stock

    def test_pack_rounding_does_not_exceed_max_stock(self):
        q = calculate_recommended_quantity(
            on_hand=60, on_order=0, max_stock_level=100, order_multiple=30, **self.base
        )
        assert q.recommended_quantity == 30
        assert 60 + q.recommended_quantity <= 100

    def test_moq_wins_when_it_cannot_fit_max_stock(self):
        q = calculate_recommended_quantity(
            on_hand=60, on_order=0, max_stock_level=100, moq=50, **self.base
        )
        assert q.recommended_quantity == 50

    @pytest.mark.parametrize("kw", [{"moq": 0}, {"order_multiple": 0}])
    def test_invalid_moq_or_multiple(self, kw):
        with pytest.raises(ValueError):
            calculate_recommended_quantity(on_hand=0, on_order=0, **self.base, **kw)


# ------------------------------------------------------------ end-to-end scenarios
@pytest.mark.parametrize(
    "on_hand,on_order,expected_reorder,expected_urgency,expected_qty",
    [
        (200, 0, False, URGENCY_NONE, None),
        (80, 0, False, URGENCY_NONE, None),
        (60, 0, True, URGENCY_MEDIUM, 80),
        (60, 100, False, URGENCY_NONE, None),
        (0, 0, True, URGENCY_CRITICAL, 140),
    ],
)
def test_full_reorder_scenarios(on_hand, on_order, expected_reorder, expected_urgency, expected_qty):
    """demand 10/day, lead time 5d, fixed-days(2) safety stock => SS 20, ROP 70, target 140."""
    ss = calculate_safety_stock(
        avg_daily_demand=10, lead_time_days=5, method="fixed_days", fixed_days=2
    ).safety_stock
    assert ss == 20

    decision = decide_reorder(
        on_hand=on_hand, on_order=on_order, avg_daily_demand=10, lead_time_days=5, safety_stock=ss
    )
    qty = calculate_recommended_quantity(
        on_hand=on_hand, on_order=on_order, avg_daily_demand=10, lead_time_days=5, safety_stock=ss
    )
    assert decision.should_reorder is expected_reorder
    assert decision.urgency == expected_urgency
    if expected_qty is not None:
        assert qty.recommended_quantity == expected_qty

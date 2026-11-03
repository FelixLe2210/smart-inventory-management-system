"""Sprint9-07 - Shortage Risk Logic."""
import pytest

from app.services.shortage_risk_logic import (
    RISK_HIGH,
    RISK_LOW,
    RISK_MEDIUM,
    assess_shortage_risk,
    normal_loss,
)

BASE = dict(daily_demand=10, lead_time_days=5, demand_std=3, safety_stock=20)


def test_plenty_of_stock_is_low_risk():
    r = assess_shortage_risk(on_hand=100, **BASE)
    assert r.level == RISK_LOW
    assert r.days_until_stockout is None and r.stockout_probability < 0.01
    assert r.projected_min_stock == 50 and r.reasons == []


def test_stock_below_lead_time_demand_is_high_risk():
    r = assess_shortage_risk(on_hand=40, **BASE)
    assert r.level == RISK_HIGH
    assert r.days_until_stockout == 5 and r.projected_min_stock == -10
    assert r.stockout_probability > 0.5 and r.expected_shortage_units > 0


def test_stock_exactly_equal_to_lead_time_demand_is_not_a_projected_stockout():
    r = assess_shortage_risk(on_hand=50, **BASE)
    assert r.days_until_stockout is None
    assert r.stockout_probability == pytest.approx(0.5, abs=0.01)
    assert r.level == RISK_HIGH  # coin-flip chance of running out


def test_dipping_into_safety_stock_without_high_probability_is_medium():
    r = assess_shortage_risk(on_hand=60, **BASE)  # 10 spare units, sigma ~ 6.7 -> P ~ 7%
    assert r.level == RISK_MEDIUM
    assert any("safety stock" in x for x in r.reasons)


def test_medium_by_probability():
    r = assess_shortage_risk(on_hand=57, **BASE)  # z ~ 1.04 -> P ~ 15%
    assert r.level == RISK_MEDIUM and r.stockout_probability >= 0.10


def test_stock_covering_safety_level_at_95_percent_is_low():
    # S = mu + z95 * sigma  -> P ~ 5%
    sigma = (5 * 3 ** 2) ** 0.5
    safety = 1.645 * sigma  # what the statistical safety stock would be at 95%
    r = assess_shortage_risk(on_hand=50 + safety + 0.5, **{**BASE, "safety_stock": safety})
    assert r.level == RISK_LOW and r.stockout_probability <= 0.05


def test_incoming_delivery_inside_window_removes_risk():
    r = assess_shortage_risk(on_hand=40, arrivals=[(2, 100)], **BASE)
    assert r.level == RISK_LOW and r.days_until_stockout is None


def test_incoming_delivery_that_arrives_too_late_does_not_help():
    late = assess_shortage_risk(on_hand=25, arrivals=[(5, 100)], **BASE)
    assert late.days_until_stockout == 3  # 25 - 10*3 < 0, delivery on day 5 is too late
    assert late.level == RISK_HIGH


def test_delivery_after_the_window_is_ignored():
    r = assess_shortage_risk(on_hand=40, arrivals=[(9, 500)], **BASE)
    assert r.level == RISK_HIGH and r.available_by_window_end == 40


def test_out_of_stock_is_high_risk_on_day_one():
    r = assess_shortage_risk(on_hand=0, **BASE)
    assert r.level == RISK_HIGH and r.days_until_stockout == 1


def test_forecast_series_is_used_day_by_day():
    r = assess_shortage_risk(
        on_hand=30, daily_demand=[5, 5, 5, 30, 30], lead_time_days=5, safety_stock=0
    )
    assert r.days_until_stockout == 4  # 30 -> 25 -> 20 -> 15 -> -15


def test_short_forecast_is_padded_with_its_mean():
    r = assess_shortage_risk(on_hand=45, daily_demand=[10, 10], lead_time_days=5)
    assert r.demand_in_window == 50 and r.days_until_stockout == 5


def test_fractional_lead_time_exposes_part_of_last_day():
    r = assess_shortage_risk(on_hand=100, daily_demand=10, lead_time_days=2.5)
    assert r.window_days == 3 and r.demand_in_window == 25


def test_zero_lead_time_has_no_exposure():
    r = assess_shortage_risk(on_hand=0, daily_demand=10, lead_time_days=0)
    assert r.level == RISK_LOW and r.demand_in_window == 0


def test_lead_time_variability_raises_probability():
    steady = assess_shortage_risk(on_hand=65, **BASE)
    erratic = assess_shortage_risk(on_hand=65, lead_time_std=2, **BASE)
    assert erratic.stockout_probability > steady.stockout_probability


def test_no_variability_is_deterministic():
    assert assess_shortage_risk(on_hand=51, daily_demand=10, lead_time_days=5).stockout_probability == 0
    assert assess_shortage_risk(on_hand=49, daily_demand=10, lead_time_days=5).stockout_probability == 1


def test_normal_loss_known_values():
    assert normal_loss(0) == pytest.approx(0.3989, abs=1e-3)
    assert normal_loss(2) == pytest.approx(0.0085, abs=1e-3)


@pytest.mark.parametrize(
    "kw",
    [
        dict(on_hand=-1), dict(lead_time_days=-1), dict(demand_std=-1), dict(safety_stock=-1),
        dict(arrivals=[(-1, 5)]), dict(arrivals=[(1, -5)]), dict(daily_demand=[]), dict(daily_demand=[-1]),
        dict(medium_probability=0.6),
    ],
)
def test_invalid_inputs(kw):
    args = dict(on_hand=10, daily_demand=5, lead_time_days=3)
    args.update(kw)
    with pytest.raises(ValueError):
        assess_shortage_risk(**args)

"""Sprint9-05 - Lead Time Logic."""
from datetime import date

import pytest

from app.services.lead_time_logic import (
    SOURCE_DEFAULT,
    SOURCE_OBSERVED,
    SOURCE_SUPPLIER,
    estimate_lead_time,
    expected_arrival_date,
    lead_time_demand,
    suggest_order_timing,
)


class TestEstimateLeadTime:
    def test_perfectly_reliable_supplier_has_no_spread(self):
        r = estimate_lead_time(supplier_lead_time_days=7, reliability_score=1.0)
        assert (r.expected_days, r.std_days, r.worst_case_days) == (7, 0, 7)
        assert r.source == SOURCE_SUPPLIER

    def test_unreliable_supplier_adds_spread(self):
        r = estimate_lead_time(supplier_lead_time_days=10, reliability_score=0.8)
        assert r.std_days == pytest.approx(1.0)  # 10 * 0.2 * 0.5
        assert r.worst_case_days == pytest.approx(12.0)

    def test_lower_reliability_means_larger_spread(self):
        hi = estimate_lead_time(supplier_lead_time_days=10, reliability_score=0.95)
        lo = estimate_lead_time(supplier_lead_time_days=10, reliability_score=0.60)
        assert lo.std_days > hi.std_days

    def test_observed_history_overrides_supplier_default(self):
        r = estimate_lead_time(
            supplier_lead_time_days=5, reliability_score=1.0, observed_lead_times=[8, 10, 12]
        )
        assert r.source == SOURCE_OBSERVED
        assert r.expected_days == 10
        assert r.std_days == pytest.approx(2.0)  # sample std of 8, 10, 12
        assert r.samples == 3

    def test_too_few_observations_fall_back_with_warning(self):
        r = estimate_lead_time(supplier_lead_time_days=5, reliability_score=1.0, observed_lead_times=[9, 11])
        assert r.source == SOURCE_SUPPLIER and r.expected_days == 5
        assert any("observed" in w for w in r.warnings)

    def test_invalid_observations_are_ignored(self):
        r = estimate_lead_time(
            supplier_lead_time_days=5, observed_lead_times=[6, 7, 8, -3, float("nan")]
        )
        assert r.source == SOURCE_OBSERVED and r.samples == 3
        assert any("invalid" in w for w in r.warnings)

    def test_nothing_known_uses_default_and_warns(self):
        r = estimate_lead_time()
        assert r.source == SOURCE_DEFAULT and r.expected_days == 7
        assert len(r.warnings) == 2  # lead time and reliability unknown

    def test_processing_days_shift_expected_value_only(self):
        r = estimate_lead_time(supplier_lead_time_days=5, reliability_score=0.8, processing_days=2)
        assert r.expected_days == 7 and r.std_days == pytest.approx(0.5)

    @pytest.mark.parametrize(
        "kw",
        [{"supplier_lead_time_days": -1}, {"reliability_score": 1.2}, {"reliability_score": -0.1},
         {"processing_days": -1}, {"min_samples": 1}],
    )
    def test_invalid_arguments(self, kw):
        with pytest.raises(ValueError):
            estimate_lead_time(**kw)


def test_lead_time_demand():
    assert lead_time_demand(12.5, 4) == 50
    with pytest.raises(ValueError):
        lead_time_demand(-1, 4)


def test_expected_arrival_rounds_fraction_up():
    assert expected_arrival_date(date(2026, 11, 5), 6.2) == date(2026, 11, 12)


class TestOrderTiming:
    kw = dict(today=date(2026, 11, 5), reorder_point=70, avg_daily_demand=10, lead_time_days=5)

    def test_order_today_when_at_or_below_reorder_point(self):
        t = suggest_order_timing(inventory_position=70, **self.kw)
        assert t.order_date == date(2026, 11, 5) and t.days_until_order == 0
        assert t.expected_arrival_date == date(2026, 11, 10)

    def test_order_can_wait_until_position_reaches_reorder_point(self):
        t = suggest_order_timing(inventory_position=125, **self.kw)  # (125-70)/10 = 5.5 -> 5 days
        assert t.days_until_order == 5 and t.order_date == date(2026, 11, 10)

    def test_no_demand_and_above_rop_means_nothing_to_schedule(self):
        t = suggest_order_timing(
            inventory_position=100, today=date(2026, 11, 5), reorder_point=70, avg_daily_demand=0, lead_time_days=5
        )
        assert t.order_date is None and t.expected_arrival_date is None

    def test_days_late_when_delivery_misses_stockout(self):
        t = suggest_order_timing(inventory_position=10, days_until_stockout=2, **self.kw)
        assert t.days_late == 3  # arrives on day 5, stock-out on day 2

    def test_not_late_when_delivery_beats_stockout(self):
        t = suggest_order_timing(inventory_position=10, days_until_stockout=9, **self.kw)
        assert t.days_late == 0

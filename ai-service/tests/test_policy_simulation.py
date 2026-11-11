import numpy as np
from datetime import date, timedelta

from data_prep.s09_policy_simulation import SCENARIOS, SeriesResult, _draw_lead_times, conclusion, render_markdown, run, simulate_series


def _flat(n=200, level=10.0):
    d = np.full(n, level)
    return d, [date(2026, 1, 1) + timedelta(days=i) for i in range(n)]


def test_lead_draws_are_deterministic_and_positive():
    a = _draw_lead_times(50, SCENARIOS[1], 3)
    assert (a == _draw_lead_times(50, SCENARIOS[1], 3)).all() and a.min() >= 1


def test_flat_demand_policies_serve_demand_and_conserve_units():
    demand, dates = _flat()
    lead = _draw_lead_times(len(demand), SCENARIOS[0], 1)
    for policy, kw in (("static", {"min_days": 10}), ("ai2", {})):
        r = simulate_series(demand, dates, 80, policy, SCENARIOS[0], lead, **kw)
        assert r.days == 120 and r.demand == 1200
        assert 0 <= r.lost <= r.demand
        assert r.metrics()["fill_rate"] > 0.9


def test_higher_static_min_never_hurts_fill_rate_on_flat_demand():
    demand, dates = _flat()
    lead = _draw_lead_times(len(demand), SCENARIOS[1], 2)
    lo = simulate_series(demand, dates, 80, "static", SCENARIOS[1], lead, 3).metrics()["fill_rate"]
    hi = simulate_series(demand, dates, 80, "static", SCENARIOS[1], lead, 14).metrics()["fill_rate"]
    assert hi >= lo


def test_run_and_report_render():
    demand, dates = _flat()
    rep = run({("A", "W"): (demand, dates)}, days=100, seed=1)
    assert len(rep["scenarios"]) == len(SCENARIOS) and "ai2" in rep["scenarios"][0]["policies"]
    md = render_markdown(rep)
    assert "AI #2" in md and "Giới hạn" in md and conclusion(rep["scenarios"][0])


def test_empty_result_metrics_safe():
    assert SeriesResult().metrics()["fill_rate"] == 1.0

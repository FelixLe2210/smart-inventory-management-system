"""Sprint8-05/06/07 – dự báo 7/14/30 ngày."""
import pytest
from datetime import date, timedelta


@pytest.mark.parametrize("days", [7, 14, 30])
def test_preset_horizon_returns_exact_days(client, days):
    res = client.get(f"/api/forecast/product/1/horizon/{days}?warehouse_id=1&start_date=2026-11-01").json()
    assert res["success"] is True
    data = res["data"]
    assert data["horizon_days"] == days
    assert len(data["predictions"]) == days
    dates = [p["date"] for p in data["predictions"]]
    expected = [(date(2026, 11, 1) + timedelta(days=i)).isoformat() for i in range(days)]
    assert dates == expected                       # liên tục, không trùng ngày
    assert data["forecast_end_date"] == expected[-1]
    for p in data["predictions"]:
        assert 0 <= p["lower_bound"] <= p["predicted_demand"] <= p["upper_bound"]
    assert abs(data["total_predicted_demand"] - sum(p["predicted_demand"] for p in data["predictions"])) < 0.1 * days


def test_unsupported_horizon_rejected(client):
    for days in (1, 10, 60):
        r = client.get(f"/api/forecast/product/1/horizon/{days}")
        assert r.status_code == 400
        assert r.json()["success"] is False


def test_horizons_listing(client):
    assert client.get("/api/forecast/horizons").json()["data"]["horizons"] == [7, 14, 30]


def test_forecast_is_deterministic_for_same_input(client):
    url = "/api/forecast/product/3/horizon/7?warehouse_id=1&start_date=2026-11-01"
    assert client.get(url).json()["data"]["predictions"] == client.get(url).json()["data"]["predictions"]

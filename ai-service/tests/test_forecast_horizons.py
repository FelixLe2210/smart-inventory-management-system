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


def test_forecast_scenarios_cover_multiple_products_and_warehouses(client):
    scenarios = [(1, 1, 8.0), (3, 2, 24.0), (8, 3, 45.0)]
    start_date = date(2026, 11, 1)

    for product_id, warehouse_id, quantity in scenarios:
        history = [
            {
                "date": (start_date - timedelta(days=30 - index)).isoformat(),
                "quantity": quantity + index % 5,
            }
            for index in range(30)
        ]
        response = client.post(
            "/api/forecast/demand",
            json={
                "product_id": product_id,
                "warehouse_id": warehouse_id,
                "horizon_days": 14,
                "start_date": start_date.isoformat(),
                "historical_data": history,
            },
        )

        assert response.status_code == 200
        data = response.json()["data"]
        assert data["product_id"] == product_id
        assert data["warehouse_id"] == warehouse_id
        assert data["horizon_days"] == 14
        assert len(data["predictions"]) == 14
        assert data["predictions"][0]["date"] == start_date.isoformat()
        assert all(
            0 <= point["lower_bound"] <= point["predicted_demand"] <= point["upper_bound"]
            for point in data["predictions"]
        )

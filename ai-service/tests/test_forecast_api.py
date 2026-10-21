def test_forecast_demand_post_success(client):
    payload = {
        "product_id": 1,
        "warehouse_id": 2,
        "horizon_days": 7,
        "include_confidence_intervals": True,
    }
    response = client.post("/api/forecast/demand", json=payload)
    assert response.status_code == 200
    res = response.json()
    assert res["success"] is True
    assert res["error"] is None

    data = res["data"]
    assert data["product_id"] == 1
    assert data["warehouse_id"] == 2
    assert data["horizon_days"] == 7
    assert len(data["predictions"]) == 7

    total_pred = sum(p["predicted_demand"] for p in data["predictions"])
    assert abs(data["total_predicted_demand"] - round(total_pred, 1)) < 0.2

    for point in data["predictions"]:
        assert "date" in point
        assert "day_of_week" in point
        assert point["predicted_demand"] >= 0
        assert point["lower_bound"] <= point["predicted_demand"]
        assert point["upper_bound"] >= point["predicted_demand"]


def test_forecast_product_get_success(client):
    response = client.get("/api/forecast/product/3?warehouse_id=1&horizon_days=14")
    assert response.status_code == 200
    res = response.json()
    assert res["success"] is True

    data = res["data"]
    assert data["product_id"] == 3
    assert data["warehouse_id"] == 1
    assert data["horizon_days"] == 14
    assert len(data["predictions"]) == 14


def test_forecast_with_custom_historical_data(client):
    payload = {
        "product_id": 5,
        "warehouse_id": 1,
        "horizon_days": 3,
        "historical_data": [
            {"date": "2026-10-10", "quantity": 25.0},
            {"date": "2026-10-11", "quantity": 28.0},
            {"date": "2026-10-12", "quantity": 30.0},
            {"date": "2026-10-13", "quantity": 22.0},
            {"date": "2026-10-14", "quantity": 26.0},
        ],
    }
    response = client.post("/api/forecast/demand", json=payload)
    assert response.status_code == 200
    res = response.json()
    assert res["success"] is True
    assert len(res["data"]["predictions"]) == 3


def test_forecast_validation_error_missing_product_id(client):
    payload = {
        "horizon_days": 7,
    }
    response = client.post("/api/forecast/demand", json=payload)
    assert response.status_code == 400
    res = response.json()
    assert res["success"] is False
    assert res["error"]["code"] == "VALIDATION_ERROR"
    assert "details" in res["error"]
    assert any("product_id" in d for d in res["error"]["details"])


def test_forecast_validation_error_invalid_horizon_days(client):
    payload = {
        "product_id": 1,
        "horizon_days": 100,  # Max is 90
    }
    response = client.post("/api/forecast/demand", json=payload)
    assert response.status_code == 400
    res = response.json()
    assert res["success"] is False
    assert res["error"]["code"] == "VALIDATION_ERROR"


def test_forecast_validation_error_invalid_date_format(client):
    payload = {
        "product_id": 1,
        "start_date": "not-a-valid-date",
    }
    response = client.post("/api/forecast/demand", json=payload)
    assert response.status_code == 400
    res = response.json()
    assert res["success"] is False
    assert res["error"]["code"] == "VALIDATION_ERROR"


def test_models_info_endpoint(client):
    response = client.get("/api/forecast/models")
    assert response.status_code == 200
    res = response.json()
    assert res["success"] is True
    assert res["data"]["is_loaded"] is True
    assert "metrics" in res["data"]
    assert "features" in res["data"]

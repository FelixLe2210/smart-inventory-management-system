"""POST /api/reorder/recommend - the contract the Spring Boot backend relies on."""
from datetime import date, timedelta

from app.schemas.forecast import HistoricalDataPoint
from app.services.reorder_orchestrator import fill_daily_history

AS_OF = date(2026, 11, 5)


def sales(days=60, per_day=10, skip_every=0):
    out = []
    for i in range(days, 0, -1):
        d = AS_OF - timedelta(days=i)
        if skip_every and i % skip_every == 0:
            continue
        out.append({"date": d.isoformat(), "quantity": per_day})
    return out


def body(**kw):
    base = {
        "product_id": 1, "warehouse_id": 1, "as_of": AS_OF.isoformat(), "on_hand": 40,
        "historical_data": sales(), "supplier_lead_time_days": 7, "supplier_reliability": 0.9,
    }
    base.update(kw)
    return base


def test_low_stock_product_gets_a_reorder(client):
    r = client.post("/api/reorder/recommend", json=body())
    assert r.status_code == 200
    d = r.json()["data"]
    assert d["action"] == "REORDER" and d["recommended_quantity"] > 0
    assert d["history_source"] == "provided" and d["history_days"] == 60
    assert d["urgency_level"] in {"LOW", "MEDIUM", "HIGH", "CRITICAL"}
    assert 6 <= d["avg_daily_demand"] <= 16  # ~10 units/day in the history
    assert d["suggested_order_date"] == AS_OF.isoformat()
    assert d["forecast_horizon_days"] >= 14


def test_plenty_of_stock_needs_nothing(client):
    d = client.post("/api/reorder/recommend", json=body(on_hand=5000)).json()["data"]
    assert d["action"] == "NONE" and d["recommended_quantity"] == 0


def test_open_purchase_order_is_taken_into_account(client):
    po = {"po_id": 7, "po_number": "PO-7", "status": "SENT", "ordered_qty": 300, "received_qty": 0,
          "expected_delivery_date": (AS_OF + timedelta(days=3)).isoformat()}
    d = client.post("/api/reorder/recommend", json=body(purchase_orders=[po])).json()["data"]
    assert d["incoming_stock"] == 300 and d["action"] == "NONE"


def test_draft_purchase_order_is_ignored(client):
    po = {"po_id": 8, "status": "DRAFT", "ordered_qty": 300}
    d = client.post("/api/reorder/recommend", json=body(purchase_orders=[po])).json()["data"]
    assert d["incoming_stock"] == 0 and d["assumptions"]["draft_po_qty_excluded"] == 300


def test_no_sales_history_never_uses_made_up_demand(client):
    d = client.post("/api/reorder/recommend", json=body(historical_data=[], on_hand=40)).json()["data"]
    assert d["history_source"] == "insufficient_history" and d["history_days"] == 0
    assert d["avg_daily_demand"] == 0 and d["forecast_model"] == "none"
    assert d["action"] == "NONE"  # no demand evidence -> no order from a guess
    assert "demand is unknown" in d["warnings"][0]


def test_no_history_still_respects_minimum_stock_level(client):
    d = client.post("/api/reorder/recommend", json=body(historical_data=[], on_hand=5, min_stock_level=20)).json()["data"]
    assert d["history_source"] == "insufficient_history"
    assert d["action"] == "REORDER" and d["recommended_quantity"] > 0


def test_short_history_uses_the_average_of_real_days(client):
    d = client.post("/api/reorder/recommend", json=body(historical_data=sales(days=10, per_day=8), on_hand=30)).json()["data"]
    assert d["history_source"] == "short_history" and d["forecast_model"] == "moving_average"
    assert abs(d["avg_daily_demand"] - 8) < 0.5
    assert "indicative" in d["warnings"][0]
    assert d["action"] == "REORDER"  # 30 units vs 8/day over a 7-day lead time


def test_days_without_sales_count_as_zero(client):
    """Only days WITH an issue transaction reach the AI; gaps must not look like 'sold every day'."""
    sparse = client.post("/api/reorder/recommend", json=body(historical_data=sales(per_day=10, skip_every=2), on_hand=100)).json()["data"]
    full = client.post("/api/reorder/recommend", json=body(on_hand=100)).json()["data"]
    assert sparse["avg_daily_demand"] < full["avg_daily_demand"]
    assert sparse["history_days"] >= 55


def test_fill_daily_history_ignores_today_and_future():
    pts = [HistoricalDataPoint(date="2026-11-03", quantity=4), HistoricalDataPoint(date="2026-11-05", quantity=99)]
    out = fill_daily_history(pts, AS_OF)
    assert [(p.date, p.quantity) for p in out] == [("2026-11-03", 4.0), ("2026-11-04", 0.0)]


def test_product_volume_is_respected(client):
    low = client.post("/api/reorder/recommend", json=body(historical_data=sales(per_day=3), on_hand=500)).json()["data"]
    high = client.post("/api/reorder/recommend", json=body(historical_data=sales(per_day=150), on_hand=500)).json()["data"]
    assert low["avg_daily_demand"] < 6 and high["avg_daily_demand"] > 90


def test_validation_errors_use_the_standard_envelope(client):
    r = client.post("/api/reorder/recommend", json={"product_id": 0, "warehouse_id": 1, "on_hand": -5})
    assert r.status_code == 400
    assert r.json()["success"] is False and r.json()["error"]["code"] == "VALIDATION_ERROR"


def test_bad_status_value_is_tolerated_with_warning(client):
    po = {"po_id": 9, "status": "WEIRD", "ordered_qty": 10}
    r = client.post("/api/reorder/recommend", json=body(purchase_orders=[po]))
    assert r.status_code == 200 and any("unknown status" in w for w in r.json()["data"]["warnings"])


def test_batch_returns_one_result_per_item(client):
    items = [body(product_id=1), body(product_id=2, on_hand=5000)]
    d = client.post("/api/reorder/recommend-batch", json={"items": items}).json()["data"]
    assert [r["product_id"] for r in d["results"]] == [1, 2] and d["errors"] == []
    assert d["results"][0]["should_reorder"] is True and d["results"][1]["should_reorder"] is False


def test_batch_isolates_a_failing_item(client, monkeypatch):
    import app.api.reorder as mod
    real = mod.build_recommendation

    def flaky(req):
        if req.product_id == 2:
            raise RuntimeError("boom")
        return real(req)

    monkeypatch.setattr(mod, "build_recommendation", flaky)
    d = client.post("/api/reorder/recommend-batch", json={"items": [body(product_id=1), body(product_id=2)]}).json()["data"]
    assert len(d["results"]) == 1 and d["errors"][0]["product_id"] == 2 and d["errors"][0]["index"] == 1


def test_batch_rejects_empty_list(client):
    assert client.post("/api/reorder/recommend-batch", json={"items": []}).status_code == 400

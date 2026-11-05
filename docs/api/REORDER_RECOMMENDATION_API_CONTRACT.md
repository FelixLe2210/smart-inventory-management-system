# Reorder Recommendation API Contract

This is the selected contract consumed by the frontend recommendation screen:
`GET /reorder/recommendations`, `GET /reorder/recommendations/{id}`, and
`POST /reorder/recommendations`. The reorder endpoints are not implemented in
the repository backend yet; the backend/environment must expose these routes
before the screen can load live recommendations.

All responses use the standard API envelope documented in
[`API_CONVENTIONS.md`](./API_CONVENTIONS.md):

```json
{
  "success": true,
  "data": [],
  "error": null,
  "timestamp": "2026-11-04T00:00:00Z"
}
```

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/reorder/recommendations` | Return recommendations. The response data may be an array, a page with `content`, or an object with `recommendations`. |
| `GET` | `/api/reorder/recommendations/{id}` | Return one persisted recommendation for the detail view. |
| `POST` | `/api/reorder/recommendations` | Calculate/create recommendations. The request body is optional; the current UI sends `{}` to calculate for all products and warehouses. Implementations may accept filters in the body. |

## Recommendation fields

The list/detail object should expose the AI service fields below. The frontend
accepts either the Python snake_case names or their camelCase equivalents. A
persisted `id` is required for the detail endpoint; `product_id` and
`warehouse_id` can be used to identify a recommendation that has not been
persisted yet.

```json
{
  "id": 123,
  "product_id": 42,
  "warehouse_id": 3,
  "product_name": "Coffee beans",
  "product_sku": "COF-001",
  "warehouse_name": "Main warehouse",
  "action": "REORDER",
  "should_reorder": true,
  "recommended_quantity": 120,
  "urgency_level": "HIGH",
  "shortage_risk": "HIGH",
  "stockout_probability": 0.82,
  "days_until_stockout": 4,
  "expected_shortage_units": 18,
  "current_stock": 35,
  "available_stock": 30,
  "incoming_stock": 10,
  "inventory_position": 40,
  "avg_daily_demand": 8.5,
  "lead_time_days": 7,
  "lead_time_source": "supplier",
  "safety_stock": 20,
  "reorder_point": 80,
  "target_stock": 150,
  "suggested_order_date": "2026-11-04",
  "expected_arrival_date": "2026-11-11",
  "reasons": ["Inventory position is below the reorder point"],
  "warnings": []
}
```

`shortage_risk` is the primary Low/Medium/High UI signal. `CRITICAL` is displayed
as High. If that field is absent, the frontend uses `urgency_level` as a
best-effort display signal.

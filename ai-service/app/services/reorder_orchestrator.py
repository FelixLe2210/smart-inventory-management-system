"""Glue between the HTTP request, the forecast service (AI #1) and the reorder service (AI #2)."""
from __future__ import annotations

import math
from datetime import date, timedelta
from statistics import mean, stdev
from typing import List, Tuple

from app.schemas.forecast import DemandForecastRequest, HistoricalDataPoint
from app.schemas.reorder import ReorderRecommendRequest, ReorderRecommendResponse
from app.services.forecast_service import MIN_REAL_HISTORY_POINTS, forecast_service
from app.services.incoming_stock_logic import PurchaseOrderLine
from app.services.lead_time_logic import estimate_lead_time
from app.services.reorder_service import ForecastPoint, ReorderInput, recommend_reorder

MAX_HISTORY_DAYS = 120
MIN_FORECAST_DAYS = 14
MAX_FORECAST_DAYS = 90

# How much real sales history decides how demand is estimated (history_source):
#   provided             >= 14 days -> AI #1 model forecast
#   short_history        7-13 days  -> flat average of the real days (a model needs 14 days of lags)
#   insufficient_history < 7 days   -> demand unknown: assumed 0, only the minimum-stock rule applies
# We never feed the model a made-up history for a real product.
MODEL_MIN_DAYS = MIN_REAL_HISTORY_POINTS
SHORT_HISTORY_MIN_DAYS = 7
Z95 = 1.96


def fill_daily_history(points: List[HistoricalDataPoint], as_of: date) -> List[HistoricalDataPoint]:
    """One row per calendar day up to (not including) ``as_of``; missing days = 0 sales.

    The backend only knows days WITH an issue transaction. Leaving the gaps out would make the
    product look like it sells every day and overstate demand.
    """
    totals: dict = {}
    for p in points:
        d = date.fromisoformat(p.date)
        if d < as_of:  # today is incomplete
            totals[d] = totals.get(d, 0.0) + p.quantity
    if not totals:
        return []
    start = max(min(totals), as_of - timedelta(days=MAX_HISTORY_DAYS))
    days = (as_of - start).days
    return [
        HistoricalDataPoint(date=(start + timedelta(days=i)).isoformat(), quantity=totals.get(start + timedelta(days=i), 0.0))
        for i in range(days)
    ]


def build_recommendation(req: ReorderRecommendRequest) -> ReorderRecommendResponse:
    as_of = date.fromisoformat(req.as_of) if req.as_of else date.today()

    lead = estimate_lead_time(
        supplier_lead_time_days=req.supplier_lead_time_days,
        reliability_score=req.supplier_reliability,
        observed_lead_times=req.observed_lead_times,
    )
    horizon = min(MAX_FORECAST_DAYS, max(MIN_FORECAST_DAYS, math.ceil(lead.expected_days + req.review_period_days)))

    history = fill_daily_history(req.historical_data, as_of)
    points, history_source, model_name, model_version, notes = _demand_forecast(req, history, as_of, horizon)

    lines = [
        PurchaseOrderLine(
            po_id=l.po_id,
            product_id=req.product_id,
            warehouse_id=req.warehouse_id,
            status=l.status,
            ordered_qty=l.ordered_qty,
            received_qty=l.received_qty,
            expected_delivery_date=date.fromisoformat(l.expected_delivery_date) if l.expected_delivery_date else None,
            po_number=l.po_number,
        )
        for l in req.purchase_orders
    ]
    rec = recommend_reorder(
        ReorderInput(
            product_id=req.product_id,
            warehouse_id=req.warehouse_id,
            as_of=as_of,
            on_hand=req.on_hand,
            reserved=req.reserved,
            forecast=points,
            po_lines=lines,
            supplier_lead_time_days=req.supplier_lead_time_days,
            supplier_reliability=req.supplier_reliability,
            observed_lead_times=req.observed_lead_times or None,
            min_stock_level=req.min_stock_level,
            max_stock_level=req.max_stock_level,
            moq=req.moq,
            order_multiple=req.order_multiple,
            service_level=req.service_level,
            review_period_days=req.review_period_days,
            safety_stock_method=req.safety_stock_method,
            use_available_stock=req.use_available_stock,
        )
    )

    data = rec.to_dict()
    data["warnings"] = notes + data["warnings"]
    return ReorderRecommendResponse(
        **data,
        history_source=history_source,
        history_days=len(history),
        forecast_horizon_days=horizon,
        forecast_model=model_name,
        forecast_model_version=model_version,
    )


def _demand_forecast(
    req: ReorderRecommendRequest, history: List[HistoricalDataPoint], as_of: date, horizon: int
) -> Tuple[List[ForecastPoint], str, str, str, List[str]]:
    """Daily demand for the next ``horizon`` days + how it was obtained."""
    days = len(history)
    if days >= MODEL_MIN_DAYS:
        forecast = forecast_service.generate_forecast(
            DemandForecastRequest(
                product_id=req.product_id,
                warehouse_id=req.warehouse_id,
                horizon_days=horizon,
                start_date=(as_of + timedelta(days=1)).isoformat(),
                historical_data=history,
            )
        )
        points = [ForecastPoint(p.predicted_demand, p.lower_bound, p.upper_bound) for p in forecast.predictions]
        return points, "provided", forecast.model_name, forecast.model_version, []

    if days >= SHORT_HISTORY_MIN_DAYS:
        qty = [h.quantity for h in history]
        avg = mean(qty)
        sigma = max(stdev(qty), math.sqrt(avg))  # never below Poisson noise
        point = ForecastPoint(round(avg, 2), round(max(0.0, avg - Z95 * sigma), 2), round(avg + Z95 * sigma, 2))
        note = (
            f"Only {days} day(s) of sales history (the AI model needs {MODEL_MIN_DAYS}); "
            "demand is the simple average of those days - treat this recommendation as indicative"
        )
        return [point] * horizon, "short_history", "moving_average", "1", [note]

    note = (
        f"Only {days} day(s) of sales history (at least {SHORT_HISTORY_MIN_DAYS} needed): demand is unknown, "
        "assumed 0 - only the product's minimum stock level can trigger an order"
    )
    return [ForecastPoint(0.0, 0.0, 0.0)] * horizon, "insufficient_history", "none", "0", [note]

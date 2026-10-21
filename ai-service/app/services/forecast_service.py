from datetime import date, timedelta
import logging
from typing import Optional
import pandas as pd

from app.config import settings
from app.ml.model_registry import registry
from app.schemas.forecast import (
    DemandForecastRequest,
    DemandForecastResponse,
    PredictionPoint,
)

logger = logging.getLogger("ai_service.services.forecast")


class ForecastService:
    """Service handling demand forecast generation and calculations."""

    @staticmethod
    def generate_forecast(request: DemandForecastRequest) -> DemandForecastResponse:
        """Produce forward-looking daily demand predictions for requested product."""
        # Ensure active pipeline is loaded
        pipeline = registry.active_pipeline
        fallback_applied = False

        if pipeline is None:
            try:
                pipeline = registry.load_or_initialize()
            except Exception as e:
                logger.warning(f"Could not load or initialize ML model: {e}")
                if not settings.ALLOW_RULE_BASED_FALLBACK:
                    raise RuntimeError("Forecast model not available and rule-based fallback is disabled.")
                fallback_applied = True

        # Parse start date
        if request.start_date:
            start_d = date.fromisoformat(request.start_date)
        else:
            start_d = date.today() + timedelta(days=1)

        # Convert historical data if provided
        hist_df: Optional[pd.DataFrame] = None
        if request.historical_data and len(request.historical_data) > 0:
            hist_records = [
                {
                    "date": pt.date,
                    "product_id": request.product_id,
                    "warehouse_id": request.warehouse_id or 1,
                    "demand": pt.quantity,
                }
                for pt in request.historical_data
            ]
            hist_df = pd.DataFrame(hist_records)

        # Generate predictions
        if pipeline is not None and not fallback_applied:
            raw_preds = pipeline.predict_multi_step(
                product_id=request.product_id,
                warehouse_id=request.warehouse_id,
                horizon_days=request.horizon_days,
                start_date=start_d,
                historical_series=hist_df,
                confidence_level=settings.DEFAULT_CONFIDENCE_LEVEL,
            )
            model_name = registry.active_model_name or settings.DEFAULT_MODEL_NAME
            model_version = pipeline.version
        else:
            # Rule-based fallback calculation
            raw_preds = []
            base = 12.0 + (request.product_id * 2.5) % 25
            for i in range(request.horizon_days):
                cur = start_d + timedelta(days=i)
                factor = 1.25 if cur.weekday() in (4, 5) else 1.0
                pred_val = round(base * factor, 1)
                margin = round(pred_val * 0.2, 1)
                raw_preds.append(
                    {
                        "date": cur.isoformat(),
                        "day_of_week": cur.strftime("%A"),
                        "predicted_demand": pred_val,
                        "lower_bound": max(0.0, round(pred_val - margin, 1)),
                        "upper_bound": round(pred_val + margin, 1),
                    }
                )
            model_name = "rule_based_fallback"
            model_version = "0.0.1"
            fallback_applied = True

        # Map to Pydantic PredictionPoint
        prediction_points = [
            PredictionPoint(
                date=p["date"],
                day_of_week=p["day_of_week"],
                predicted_demand=p["predicted_demand"],
                lower_bound=p["lower_bound"] if request.include_confidence_intervals else p["predicted_demand"],
                upper_bound=p["upper_bound"] if request.include_confidence_intervals else p["predicted_demand"],
            )
            for p in raw_preds
        ]

        total_demand = round(sum(p.predicted_demand for p in prediction_points), 1)
        daily_avg = round(total_demand / max(request.horizon_days, 1), 1)

        end_d = start_d + timedelta(days=request.horizon_days - 1)

        return DemandForecastResponse(
            product_id=request.product_id,
            warehouse_id=request.warehouse_id,
            forecast_start_date=start_d.isoformat(),
            forecast_end_date=end_d.isoformat(),
            horizon_days=request.horizon_days,
            predictions=prediction_points,
            total_predicted_demand=total_demand,
            daily_average=daily_avg,
            model_name=model_name,
            model_version=model_version,
            fallback_applied=fallback_applied,
        )


forecast_service = ForecastService()

from typing import Optional
from fastapi import APIRouter, HTTPException, Query, status

from app.ml.model_registry import registry
from app.schemas.envelope import ApiResponse
from app.schemas.forecast import (
    DemandForecastRequest,
    DemandForecastResponse,
    ModelInfoResponse,
    TrainingRequest,
    TrainingResponse,
)
from app.services.forecast_service import forecast_service

router = APIRouter(prefix="/api/forecast", tags=["Demand Forecasting"])


@router.post(
    "/demand",
    response_model=ApiResponse[DemandForecastResponse],
    summary="Generate demand forecast for a product",
)
@router.post(
    "",
    response_model=ApiResponse[DemandForecastResponse],
    include_in_schema=False,
)
def create_demand_forecast(
    request: DemandForecastRequest,
) -> ApiResponse[DemandForecastResponse]:
    """Calculate forward-looking daily demand predictions given a product and horizon."""
    try:
        result = forecast_service.generate_forecast(request)
        return ApiResponse.ok(result)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Forecast calculation failed: {str(e)}",
        )


@router.get(
    "/product/{product_id}",
    response_model=ApiResponse[DemandForecastResponse],
    summary="Get demand forecast for a product via GET request",
)
def get_product_forecast(
    product_id: int,
    warehouse_id: Optional[int] = Query(None, ge=1, description="Warehouse ID filter"),
    horizon_days: int = Query(7, ge=1, le=90, description="Forecast horizon in days"),
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
) -> ApiResponse[DemandForecastResponse]:
    """Retrieve standard forward-looking demand forecast for specified product."""
    request = DemandForecastRequest(
        product_id=product_id,
        warehouse_id=warehouse_id,
        horizon_days=horizon_days,
        start_date=start_date,
    )
    result = forecast_service.generate_forecast(request)
    return ApiResponse.ok(result)


@router.post(
    "/train",
    response_model=ApiResponse[TrainingResponse],
    summary="Trigger model training pipeline",
)
def train_forecast_model(
    request: TrainingRequest,
) -> ApiResponse[TrainingResponse]:
    """Run training pipeline, evaluate metrics, and save model artifact to models/ directory."""
    try:
        training_result = registry.train_and_register(
            model_type=request.model_type,
            days_of_history=request.days_of_history,
            test_size=request.test_size,
            save_as_default=request.save_as_default,
        )
        return ApiResponse.ok(TrainingResponse(**training_result))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Model training pipeline error: {str(e)}",
        )


@router.get(
    "/models",
    response_model=ApiResponse[ModelInfoResponse],
    summary="Get information on active forecasting model",
)
def get_model_status() -> ApiResponse[ModelInfoResponse]:
    """Return status, algorithm, and metrics of current active forecasting model."""
    info = registry.get_info()
    return ApiResponse.ok(info)

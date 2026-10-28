from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, Query, status

from app.ml.model_registry import registry
from app.schemas.envelope import ApiResponse
from app.schemas.forecast import (
    SUPPORTED_HORIZONS,
    DemandForecastRequest,
    DemandForecastResponse,
    ModelInfoResponse,
    ModelLoadRequest,
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
@router.post("", response_model=ApiResponse[DemandForecastResponse], include_in_schema=False)
def create_demand_forecast(request: DemandForecastRequest) -> ApiResponse[DemandForecastResponse]:
    """Dự báo nhu cầu theo ngày (1–90 ngày)."""
    try:
        return ApiResponse.ok(forecast_service.generate_forecast(request))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Forecast calculation failed: {str(e)}",
        )


@router.get("/horizons", response_model=ApiResponse[dict], summary="Các khoảng dự báo chuẩn (Sprint8-05/06/07)")
def list_horizons() -> ApiResponse[dict]:
    return ApiResponse.ok({"horizons": list(SUPPORTED_HORIZONS)})


@router.get(
    "/product/{product_id}/horizon/{days}",
    response_model=ApiResponse[DemandForecastResponse],
    summary="Dự báo chuẩn 7 / 14 / 30 ngày cho một sản phẩm",
)
def get_preset_forecast(
    product_id: int,
    days: int,
    warehouse_id: Optional[int] = Query(None, ge=1),
    start_date: Optional[str] = Query(None, description="YYYY-MM-DD, mặc định là ngày mai"),
) -> ApiResponse[DemandForecastResponse]:
    if product_id < 1:
        raise HTTPException(status_code=400, detail="product_id phải >= 1")
    if days not in SUPPORTED_HORIZONS:
        raise HTTPException(status_code=400, detail=f"horizon phải là một trong {list(SUPPORTED_HORIZONS)}")
    request = DemandForecastRequest(
        product_id=product_id, warehouse_id=warehouse_id, horizon_days=days, start_date=start_date
    )
    return ApiResponse.ok(forecast_service.generate_forecast(request))


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
    request = DemandForecastRequest(
        product_id=product_id, warehouse_id=warehouse_id, horizon_days=horizon_days, start_date=start_date
    )
    return ApiResponse.ok(forecast_service.generate_forecast(request))


@router.post("/train", response_model=ApiResponse[TrainingResponse], summary="Trigger model training pipeline")
def train_forecast_model(request: TrainingRequest) -> ApiResponse[TrainingResponse]:
    try:
        result = registry.train_and_register(
            model_type=request.model_type,
            days_of_history=request.days_of_history,
            test_size=request.test_size,
            save_as_default=request.save_as_default,
        )
        return ApiResponse.ok(TrainingResponse(**result))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Model training pipeline error: {str(e)}",
        )


@router.get("/models", response_model=ApiResponse[ModelInfoResponse], summary="Model đang dùng")
def get_model_status() -> ApiResponse[ModelInfoResponse]:
    return ApiResponse.ok(registry.get_info())


@router.get("/models/saved", response_model=ApiResponse[List[Dict[str, Any]]], summary="Các model đã lưu trên đĩa")
def list_saved_models() -> ApiResponse[List[Dict[str, Any]]]:
    return ApiResponse.ok(registry.list_models())


@router.post("/models/load", response_model=ApiResponse[ModelInfoResponse], summary="Nạp model đã lưu làm model đang dùng")
def load_saved_model(request: ModelLoadRequest) -> ApiResponse[ModelInfoResponse]:
    try:
        registry.load_model(request.model_name)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:  # tên sai hoặc artifact hỏng; model đang dùng không bị đổi
        raise HTTPException(status_code=400, detail=str(e))
    return ApiResponse.ok(registry.get_info())

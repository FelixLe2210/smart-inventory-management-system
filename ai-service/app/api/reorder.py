import logging

from fastapi import APIRouter

from app.schemas.envelope import ApiResponse
from app.schemas.reorder import (
    ReorderBatchError,
    ReorderBatchRequest,
    ReorderBatchResponse,
    ReorderRecommendRequest,
    ReorderRecommendResponse,
)
from app.services.reorder_orchestrator import build_recommendation

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/reorder", tags=["Reorder Recommendation"])


@router.post(
    "/recommend",
    response_model=ApiResponse[ReorderRecommendResponse],
    summary="Reorder recommendation for one product at one warehouse (AI #2)",
)
def recommend(request: ReorderRecommendRequest) -> ApiResponse[ReorderRecommendResponse]:
    """Forecast demand (AI #1) -> lead time, incoming stock, safety stock, shortage risk, quantity."""
    return ApiResponse.ok(build_recommendation(request))


@router.post(
    "/recommend-batch",
    response_model=ApiResponse[ReorderBatchResponse],
    summary="Reorder recommendations for many product/warehouse pairs in one call",
)
def recommend_batch(request: ReorderBatchRequest) -> ApiResponse[ReorderBatchResponse]:
    """Một lần gọi HTTP thay cho N lần; mục lỗi được báo riêng, các mục còn lại vẫn có kết quả."""
    results, errors = [], []
    for i, item in enumerate(request.items):
        try:
            results.append(build_recommendation(item))
        except Exception as exc:  # noqa: BLE001 - cô lập lỗi từng mục
            logger.warning("batch item %s (product %s, warehouse %s) failed: %s", i, item.product_id, item.warehouse_id, exc)
            errors.append(ReorderBatchError(index=i, product_id=item.product_id, warehouse_id=item.warehouse_id, message=str(exc)))
    return ApiResponse.ok(ReorderBatchResponse(results=results, errors=errors))

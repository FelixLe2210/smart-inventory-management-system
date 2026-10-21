from datetime import datetime, timezone
from fastapi import APIRouter
from app.config import settings
from app.ml.model_registry import registry
from app.schemas.envelope import ApiResponse

router = APIRouter(tags=["Health"])

START_TIME = datetime.now(timezone.utc)


@router.get("/health", response_model=ApiResponse[dict])
@router.get("/api/health", response_model=ApiResponse[dict])
def health_check() -> ApiResponse[dict]:
    """Health check endpoint to verify AI service availability and model status."""
    uptime_seconds = int((datetime.now(timezone.utc) - START_TIME).total_seconds())
    model_info = registry.get_info()

    payload = {
        "status": "UP",
        "service": settings.APP_NAME,
        "environment": settings.APP_ENV,
        "uptime_seconds": uptime_seconds,
        "model_loaded": model_info.is_loaded,
        "active_model": model_info.model_name,
        "algorithm": model_info.algorithm,
    }
    return ApiResponse.ok(payload)

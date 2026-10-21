from contextlib import asynccontextmanager
import logging
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.forecast import router as forecast_router
from app.api.health import router as health_router
from app.config import settings
from app.ml.model_registry import registry
from app.schemas.envelope import ApiResponse

logging.basicConfig(
    level=logging.INFO if not settings.DEBUG else logging.DEBUG,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("ai_service")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle event handler for model loading and resource management."""
    logger.info(f"Starting {settings.APP_NAME} in {settings.APP_ENV} mode...")
    try:
        # Pre-load or initialize default forecasting model on startup
        registry.load_or_initialize()
        logger.info(f"Model registry initialized successfully with model: {registry.active_model_name}")
    except Exception as e:
        logger.error(f"Error during model initialization on startup: {e}")
    yield
    logger.info(f"Shutting down {settings.APP_NAME}...")


app = FastAPI(
    title=settings.APP_NAME,
    description="Python FastAPI AI Service for Demand Forecasting & Reorder Recommendations",
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Exception Handlers to conform to docs/api/API_CONVENTIONS.md
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    details = []
    for err in exc.errors():
        loc = " -> ".join(str(l) for l in err.get("loc", []))
        msg = err.get("msg", "invalid")
        details.append(f"{loc}: {msg}")

    payload = ApiResponse.fail(
        code="VALIDATION_ERROR",
        message="One or more request fields failed validation.",
        details=details,
    )
    return JSONResponse(status_code=status.HTTP_400_BAD_REQUEST, content=payload.model_dump())


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    code = "BAD_REQUEST" if exc.status_code == 400 else ("INTERNAL_ERROR" if exc.status_code >= 500 else "REQUEST_ERROR")
    payload = ApiResponse.fail(code=code, message=str(exc.detail))
    return JSONResponse(status_code=exc.status_code, content=payload.model_dump())


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    logger.exception(f"Unhandled exception on {request.url.path}: {exc}")
    payload = ApiResponse.fail(code="INTERNAL_ERROR", message="An unexpected internal server error occurred.")
    return JSONResponse(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, content=payload.model_dump())


# Include API Routers
app.include_router(health_router)
app.include_router(forecast_router)


@app.get("/", tags=["Root"])
def root():
    return ApiResponse.ok(
        {
            "service": settings.APP_NAME,
            "version": "0.1.0",
            "docs_url": "/docs",
            "health_url": "/api/health",
            "forecast_endpoint": "/api/forecast/demand",
        }
    )

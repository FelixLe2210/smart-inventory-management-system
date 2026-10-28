from datetime import date
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, field_validator

SUPPORTED_HORIZONS = (7, 14, 30)  # Sprint8-05/06/07: khớp FORECAST_HORIZONS ở frontend


class HistoricalDataPoint(BaseModel):
    """Historical demand data point for a product."""

    date: str = Field(..., description="Date of historical observation (YYYY-MM-DD)")
    quantity: float = Field(..., ge=0, description="Outbound or consumed quantity")

    @field_validator("date")
    @classmethod
    def validate_date(cls, v: str) -> str:
        date.fromisoformat(v)
        return v


class DemandForecastRequest(BaseModel):
    """Input payload to request product demand forecast."""

    product_id: int = Field(..., ge=1, description="Target product ID")
    warehouse_id: Optional[int] = Field(default=None, ge=1, description="Specific warehouse ID (optional)")
    horizon_days: int = Field(default=7, ge=1, le=90, description="Number of days to forecast (1 to 90)")
    start_date: Optional[str] = Field(default=None, description="Start date for forecast (YYYY-MM-DD). Defaults to next day.")
    historical_data: Optional[List[HistoricalDataPoint]] = Field(
        default=None,
        description="Optional explicit historical daily demand data. If omitted, historical data will be retrieved from storage/baseline.",
    )
    include_confidence_intervals: bool = Field(
        default=True,
        description="Whether to calculate and return lower and upper confidence bounds",
    )

    @field_validator("start_date")
    @classmethod
    def validate_start_date(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            date.fromisoformat(v)
        return v


class PredictionPoint(BaseModel):
    """Forecasted demand for a single day."""

    date: str = Field(..., description="Forecast date (YYYY-MM-DD)")
    day_of_week: str = Field(..., description="Day name, e.g., Monday")
    predicted_demand: float = Field(..., ge=0, description="Predicted demand units")
    lower_bound: float = Field(..., ge=0, description="Lower confidence bound (e.g. 95%)")
    upper_bound: float = Field(..., ge=0, description="Upper confidence bound (e.g. 95%)")


class DemandForecastResponse(BaseModel):
    """Forecast output for a product."""

    product_id: int
    warehouse_id: Optional[int] = None
    forecast_start_date: str
    forecast_end_date: str
    horizon_days: int
    predictions: List[PredictionPoint]
    total_predicted_demand: float
    daily_average: float
    model_name: str
    model_version: str
    fallback_applied: bool = False


class TrainingRequest(BaseModel):
    """Parameters to trigger model training pipeline."""

    model_type: str = Field(default="random_forest", description="Model algorithm: random_forest or gradient_boosting")
    days_of_history: int = Field(default=180, ge=30, le=730, description="Days of synthetic/collected history to train on")
    test_size: float = Field(default=0.2, ge=0.05, le=0.5, description="Fraction of test set split")
    save_as_default: bool = Field(default=True, description="Whether to set this newly trained model as active default")


class TrainingResponse(BaseModel):
    """Metadata and performance metrics of trained model."""

    model_name: str
    model_type: str
    version: str
    trained_at: str
    samples_count: int
    features: List[str]
    metrics: Dict[str, float]
    saved_path: str


class ModelInfoResponse(BaseModel):
    """Status and metadata of the currently active model."""

    model_name: str
    is_loaded: bool
    version: Optional[str] = None
    trained_at: Optional[str] = None
    metrics: Optional[Dict[str, float]] = None
    features: Optional[List[str]] = None
    algorithm: Optional[str] = None


class ModelLoadRequest(BaseModel):
    """Yêu cầu nạp một model đã lưu làm model đang dùng."""

    model_name: str = Field(..., min_length=8, max_length=105, description="Tên file, ví dụ demand_forecast_model.joblib")

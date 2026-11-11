"""Request / response contract of the reorder (AI #2) endpoint."""
from datetime import date
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, field_validator

from app.schemas.forecast import HistoricalDataPoint


class PurchaseOrderLineIn(BaseModel):
    """Open purchase-order line for THIS product and warehouse (the caller pre-filters)."""

    po_id: int
    po_number: Optional[str] = None
    status: str = Field(..., description="DRAFT | SENT | PARTIALLY_RECEIVED | RECEIVED | CANCELLED")
    ordered_qty: int = Field(..., ge=0)
    received_qty: int = Field(default=0, ge=0)
    expected_delivery_date: Optional[str] = Field(default=None, description="YYYY-MM-DD")

    @field_validator("expected_delivery_date")
    @classmethod
    def _valid_date(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            date.fromisoformat(v)
        return v


class ReorderRecommendRequest(BaseModel):
    product_id: int = Field(..., ge=1)
    warehouse_id: int = Field(..., ge=1)
    as_of: Optional[str] = Field(default=None, description="YYYY-MM-DD, default today")

    on_hand: float = Field(..., ge=0, description="inventories.current_stock")
    reserved: float = Field(default=0, ge=0, description="inventories.reserved_stock")
    use_available_stock: bool = True

    historical_data: List[HistoricalDataPoint] = Field(
        default_factory=list,
        description="Daily OUTBOUND quantity (ISSUING). Days without a sale may be omitted: they are filled with 0.",
    )
    purchase_orders: List[PurchaseOrderLineIn] = Field(default_factory=list)

    supplier_lead_time_days: Optional[float] = Field(default=None, ge=0)
    supplier_reliability: Optional[float] = Field(default=None, ge=0, le=1)
    observed_lead_times: List[float] = Field(default_factory=list)

    min_stock_level: int = Field(default=0, ge=0)
    max_stock_level: Optional[int] = Field(default=None, ge=0)
    moq: int = Field(default=1, ge=1)
    order_multiple: int = Field(default=1, ge=1)
    service_level: float = Field(default=0.95, ge=0.5, lt=1.0)
    review_period_days: float = Field(default=7.0, ge=0, le=60)
    safety_stock_method: str = Field(default="statistical", pattern="^(statistical|max_min|fixed_days)$")

    @field_validator("as_of")
    @classmethod
    def _valid_as_of(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            date.fromisoformat(v)
        return v


class ReorderRecommendResponse(BaseModel):
    product_id: int
    warehouse_id: int
    as_of: str
    action: str
    should_reorder: bool
    recommended_quantity: int
    urgency_level: str
    shortage_risk: str
    stockout_probability: float
    days_until_stockout: Optional[int] = None
    expected_shortage_units: float
    current_stock: float
    available_stock: float
    incoming_stock: int
    inventory_position: float
    avg_daily_demand: float
    demand_std: float
    lead_time_days: float
    lead_time_std_days: float
    lead_time_source: str
    safety_stock: int
    reorder_point: int
    target_stock: int
    suggested_order_date: Optional[str] = None
    expected_arrival_date: Optional[str] = None
    days_late: int
    reasons: List[str]
    warnings: List[str]
    assumptions: Dict[str, Any]
    # forecast (AI #1) context
    history_source: str = Field(
        description="'provided' (>=14 days, AI model) | 'short_history' (7-13 days, simple average) | "
        "'insufficient_history' (<7 days, demand assumed 0)"
    )
    history_days: int = Field(description="days of sales history used (gaps filled with 0)")
    forecast_horizon_days: int
    forecast_model: str
    forecast_model_version: str


class ReorderBatchRequest(BaseModel):
    items: List[ReorderRecommendRequest] = Field(min_length=1, max_length=500)


class ReorderBatchError(BaseModel):
    index: int
    product_id: int
    warehouse_id: int
    message: str


class ReorderBatchResponse(BaseModel):
    """Lỗi ở một mục không làm hỏng cả lô: mục lỗi nằm trong ``errors``, mục tốt nằm trong ``results``."""

    results: List[ReorderRecommendResponse]
    errors: List[ReorderBatchError]

from datetime import datetime, timezone
from typing import Any, Generic, List, Optional, TypeVar
from pydantic import BaseModel, Field

T = TypeVar("T")


def current_utc_iso() -> str:
    """Return current UTC timestamp in ISO-8601 string format with 'Z' suffix."""
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


class ApiErrorDetail(BaseModel):
    """Error payload conforming to project REST API conventions."""

    code: str = Field(..., description="Machine-readable error code")
    message: str = Field(..., description="Human-readable error description")
    details: Optional[List[str]] = Field(default=None, description="Optional list of granular field error messages")


class ApiResponse(BaseModel, Generic[T]):
    """Unified response envelope matching docs/api/API_CONVENTIONS.md."""

    success: bool
    data: Optional[T] = None
    error: Optional[ApiErrorDetail] = None
    timestamp: str = Field(default_factory=current_utc_iso)

    @classmethod
    def ok(cls, data: T) -> "ApiResponse[T]":
        return cls(success=True, data=data, error=None)

    @classmethod
    def fail(cls, code: str, message: str, details: Optional[List[str]] = None) -> "ApiResponse[Any]":
        return cls(
            success=False,
            data=None,
            error=ApiErrorDetail(code=code, message=message, details=details),
        )

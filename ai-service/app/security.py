"""Bảo vệ các endpoint làm thay đổi mô hình đang chạy (huấn luyện, nạp model)."""
import hmac
from typing import Optional

from fastapi import Header, HTTPException, status

from app.config import settings


def require_admin_key(x_admin_key: Optional[str] = Header(default=None)) -> None:
    configured = settings.ADMIN_API_KEY
    if not configured:
        if settings.APP_ENV.lower() in ("development", "dev", "test"):
            return
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Admin endpoints are disabled: ADMIN_API_KEY is not configured.")
    if not x_admin_key or not hmac.compare_digest(x_admin_key, configured):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Missing or invalid X-Admin-Key header.")

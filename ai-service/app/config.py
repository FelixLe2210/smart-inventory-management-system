from pathlib import Path
from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


BASE_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = BASE_DIR.parent


class Settings(BaseSettings):
    """Application configuration settings."""

    APP_NAME: str = "Smart Inventory AI Service"
    APP_ENV: str = "development"
    DEBUG: bool = True
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # CORS origins
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:8080",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:8080",
    ]

    # Directories
    MODELS_DIR: Path = PROJECT_ROOT / "models"
    DATA_DIR: Path = PROJECT_ROOT / "data"

    # Default model configuration
    DEFAULT_MODEL_NAME: str = "demand_forecast_model.joblib"
    # Khóa quản trị cho các endpoint đổi trạng thái mô hình (huấn luyện, nạp model). Gửi qua header X-Admin-Key.
    # Để trống: cho phép khi APP_ENV=development, từ chối hoàn toàn ở môi trường khác.
    ADMIN_API_KEY: Optional[str] = None
    ALLOW_RULE_BASED_FALLBACK: bool = True
    DEFAULT_CONFIDENCE_LEVEL: float = 0.95

    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()

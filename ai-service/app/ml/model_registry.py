import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional
import pandas as pd

from app.config import settings
from app.ml.data_generator import generate_synthetic_demand
from app.ml.model_store import read_metadata, resolve_model_path
from app.ml.pipeline import DemandForecastPipeline
from app.schemas.forecast import ModelInfoResponse

logger = logging.getLogger("ai_service.ml.registry")


class ModelRegistry:
    """Quản lý model đang dùng + lưu/nạp artifact (Sprint8-08)."""

    def __init__(self, models_dir: Optional[Path] = None):
        self.models_dir = Path(models_dir or settings.MODELS_DIR)
        self.default_model_name = settings.DEFAULT_MODEL_NAME
        self.active_pipeline: Optional[DemandForecastPipeline] = None
        self.active_model_name: Optional[str] = None

    def get_default_model_path(self) -> Path:
        return resolve_model_path(self.models_dir, self.default_model_name)

    def load_or_initialize(self) -> DemandForecastPipeline:
        """Nạp model mặc định từ đĩa; nếu thiếu hoặc hỏng thì train baseline mới."""
        target_path = self.get_default_model_path()

        if target_path.exists():
            try:
                logger.info(f"Loading existing model from {target_path}")
                self.active_pipeline = DemandForecastPipeline.load(target_path)
                self.active_model_name = target_path.name
                return self.active_pipeline
            except Exception as e:
                logger.warning(f"Failed to load model from {target_path}: {e}. Initializing fresh baseline model.")

        logger.info(f"No usable model found. Training initial baseline model to {target_path}")
        pipeline = DemandForecastPipeline(model_type="random_forest")
        pipeline.train(generate_synthetic_demand(days=180, random_seed=42))
        pipeline.save(target_path)  # atomic: file hỏng cũ (nếu có) được thay nguyên vẹn

        self.active_pipeline = pipeline
        self.active_model_name = target_path.name
        return self.active_pipeline

    def train_and_register(
        self,
        model_type: str = "random_forest",
        days_of_history: int = 180,
        test_size: float = 0.2,
        save_as_default: bool = True,
        custom_df: Optional[pd.DataFrame] = None,
    ) -> Dict[str, Any]:
        """Train model mới, lưu đĩa; chỉ đổi model đang dùng khi lưu thành công."""
        df = custom_df if custom_df is not None and len(custom_df) >= 20 else generate_synthetic_demand(days=days_of_history)

        pipeline = DemandForecastPipeline(model_type=model_type)
        metrics = pipeline.train(df, test_size=test_size)

        if save_as_default:
            save_name = self.default_model_name
        else:
            stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S")
            save_name = f"demand_forecast_{model_type}_{stamp}.joblib"  # không ghi đè bản cũ
        save_path = resolve_model_path(self.models_dir, save_name)
        pipeline.save(save_path)

        if save_as_default:
            self.active_pipeline = pipeline
            self.active_model_name = save_name

        return {
            "model_name": save_name,
            "model_type": model_type,
            "version": pipeline.version,
            "trained_at": pipeline.trained_at,
            "samples_count": len(df),
            "features": pipeline.features,
            "metrics": metrics,
            "saved_path": str(save_path),
        }

    def list_models(self) -> List[Dict[str, Any]]:
        """Liệt kê model đã lưu (đọc sidecar JSON, không nạp joblib)."""
        if not self.models_dir.exists():
            return []
        items = []
        for path in sorted(self.models_dir.glob("*.joblib")):
            meta = read_metadata(path) or {}
            items.append({
                "model_name": path.name,
                "model_type": meta.get("model_type"),
                "version": meta.get("version"),
                "trained_at": meta.get("trained_at"),
                "metrics": meta.get("metrics"),
                "size_bytes": path.stat().st_size,
                "is_active": path.name == self.active_model_name,
            })
        return items

    def load_model(self, name: str) -> DemandForecastPipeline:
        """Nạp model theo tên và đặt làm model đang dùng. Lỗi thì giữ nguyên model hiện tại."""
        path = resolve_model_path(self.models_dir, name)  # ValueError nếu tên sai
        if not path.exists():
            raise FileNotFoundError(f"Không tìm thấy model: {name}")
        pipeline = DemandForecastPipeline.load(path)      # ValueError nếu file hỏng
        self.active_pipeline = pipeline
        self.active_model_name = path.name
        return pipeline

    def get_info(self) -> ModelInfoResponse:
        if self.active_pipeline is None:
            return ModelInfoResponse(model_name=self.default_model_name, is_loaded=False)
        return ModelInfoResponse(
            model_name=self.active_model_name or self.default_model_name,
            is_loaded=True,
            version=self.active_pipeline.version,
            trained_at=self.active_pipeline.trained_at,
            metrics=self.active_pipeline.metrics,
            features=self.active_pipeline.features,
            algorithm=self.active_pipeline.model_type,
        )


registry = ModelRegistry()

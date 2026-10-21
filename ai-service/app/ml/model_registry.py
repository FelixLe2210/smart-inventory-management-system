import logging
from pathlib import Path
from typing import Dict, Optional
import pandas as pd

from app.config import settings
from app.ml.data_generator import generate_synthetic_demand
from app.ml.pipeline import DemandForecastPipeline
from app.schemas.forecast import ModelInfoResponse

logger = logging.getLogger("ai_service.ml.registry")


class ModelRegistry:
    """Singleton registry managing active model instance and persistence."""

    def __init__(self, models_dir: Optional[Path] = None):
        self.models_dir = models_dir or settings.MODELS_DIR
        self.default_model_name = settings.DEFAULT_MODEL_NAME
        self.active_pipeline: Optional[DemandForecastPipeline] = None
        self.active_model_name: Optional[str] = None

    def get_default_model_path(self) -> Path:
        return self.models_dir / self.default_model_name

    def load_or_initialize(self) -> DemandForecastPipeline:
        """Load default model from disk or train an initial baseline model."""
        target_path = self.get_default_model_path()

        if target_path.exists():
            try:
                logger.info(f"Loading existing model from {target_path}")
                self.active_pipeline = DemandForecastPipeline.load(target_path)
                self.active_model_name = target_path.name
                return self.active_pipeline
            except Exception as e:
                logger.warning(f"Failed to load model from {target_path}: {e}. Initializing fresh baseline model.")

        logger.info(f"No existing model found. Training initial baseline model to {target_path}")
        pipeline = DemandForecastPipeline(model_type="random_forest")
        train_df = generate_synthetic_demand(days=180, random_seed=42)
        pipeline.train(train_df)
        pipeline.save(target_path)

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
    ) -> Dict[str, any]:
        """Train a new model, save to disk, and optionally update active pipeline."""
        if custom_df is not None and len(custom_df) >= 20:
            df = custom_df
        else:
            df = generate_synthetic_demand(days=days_of_history)

        pipeline = DemandForecastPipeline(model_type=model_type)
        metrics = pipeline.train(df, test_size=test_size)

        save_name = self.default_model_name if save_as_default else f"demand_forecast_{model_type}_{pipeline.version}.joblib"
        save_path = self.models_dir / save_name
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

    def get_info(self) -> ModelInfoResponse:
        """Inspect currently loaded model status."""
        if self.active_pipeline is None:
            return ModelInfoResponse(
                model_name=self.default_model_name,
                is_loaded=False,
            )

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

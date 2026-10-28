from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor, RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

from app.ml.feature_engineering import FEATURE_COLUMNS, build_feature_matrix
from app.ml.model_store import atomic_dump, validate_payload, write_metadata


class DemandForecastPipeline:
    """End-to-end Demand Forecasting training and inference pipeline."""

    def __init__(self, model_type: str = "random_forest"):
        self.model_type = model_type.lower()
        self.model: Optional[Any] = None
        self.features: List[str] = FEATURE_COLUMNS
        self.metrics: Dict[str, float] = {}
        self.version: str = "1.0.0"
        self.trained_at: Optional[str] = None
        self.residual_std: float = 2.5

    def _init_model(self) -> Any:
        if self.model_type == "gradient_boosting":
            return GradientBoostingRegressor(
                n_estimators=100,
                learning_rate=0.08,
                max_depth=5,
                random_state=42,
            )
        return RandomForestRegressor(
            n_estimators=100,
            max_depth=12,
            min_samples_split=4,
            random_state=42,
            n_jobs=-1,
        )

    def train(
        self,
        df: pd.DataFrame,
        test_size: float = 0.2,
    ) -> Dict[str, float]:
        """Fit model on historical dataset with chronological train/test split."""
        X, y, feature_cols = build_feature_matrix(df, target_col="demand", drop_na=True)
        if len(X) < 20:
            raise ValueError(f"Insufficient training samples ({len(X)} samples, minimum 20 required).")

        self.features = feature_cols

        split_idx = int(len(X) * (1 - test_size))
        X_train, X_test = X.iloc[:split_idx], X.iloc[split_idx:]
        y_train, y_test = y.iloc[:split_idx], y.iloc[split_idx:]

        self.model = self._init_model()
        self.model.fit(X_train, y_train)

        y_pred = self.model.predict(X_test)
        mae = float(mean_absolute_error(y_test, y_pred))
        rmse = float(np.sqrt(mean_squared_error(y_test, y_pred)))
        r2 = float(r2_score(y_test, y_pred))

        non_zero = y_test > 0.1
        if non_zero.any():
            mape = float(np.mean(np.abs((y_test[non_zero] - y_pred[non_zero]) / y_test[non_zero])) * 100)
        else:
            mape = 0.0

        residuals = y_test - y_pred
        self.residual_std = max(1.0, float(np.std(residuals)))

        self.metrics = {
            "mae": round(mae, 3),
            "rmse": round(rmse, 3),
            "r2": round(r2, 3),
            "mape": round(mape, 2),
        }
        self.trained_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

        return self.metrics

    def predict_multi_step(
        self,
        product_id: int,
        warehouse_id: Optional[int] = None,
        horizon_days: int = 7,
        start_date: Optional[date] = None,
        historical_series: Optional[pd.DataFrame] = None,
        confidence_level: float = 0.95,
    ) -> List[Dict[str, Any]]:
        """Forecast future demand over horizon_days recursively using recent historical points."""
        if start_date is None:
            start_date = date.today() + timedelta(days=1)
        if warehouse_id is None:
            warehouse_id = 1

        if historical_series is None or len(historical_series) < 14:
            hist_dates = [start_date - timedelta(days=i) for i in range(30, 0, -1)]
            base_qty = 15.0 + (product_id * 3.5) % 30
            hist_records = [
                {
                    "date": d.isoformat(),
                    "product_id": product_id,
                    "warehouse_id": warehouse_id,
                    "demand": max(1.0, base_qty + np.sin(d.weekday()) * 4.0),
                }
                for d in hist_dates
            ]
            working_df = pd.DataFrame(hist_records)
        else:
            working_df = historical_series.copy()
            if "warehouse_id" not in working_df.columns:
                working_df["warehouse_id"] = warehouse_id
            if "product_id" not in working_df.columns:
                working_df["product_id"] = product_id

        working_df["date"] = pd.to_datetime(working_df["date"])
        working_df = working_df.sort_values(by="date").reset_index(drop=True)

        predictions = []
        z_score = 1.96 if confidence_level >= 0.95 else 1.645

        for step in range(horizon_days):
            current_target_date = start_date + timedelta(days=step)
            current_dt = pd.to_datetime(current_target_date)

            tail_df = working_df.tail(20).copy()
            last_demands = tail_df["demand"].tolist()

            lag_1 = last_demands[-1] if len(last_demands) >= 1 else 10.0
            lag_2 = last_demands[-2] if len(last_demands) >= 2 else lag_1
            lag_3 = last_demands[-3] if len(last_demands) >= 3 else lag_2
            lag_7 = last_demands[-7] if len(last_demands) >= 7 else lag_1
            lag_14 = last_demands[-14] if len(last_demands) >= 14 else lag_7

            rolling_7 = float(np.mean(last_demands[-7:])) if len(last_demands) >= 7 else lag_1
            rolling_std_7 = float(np.std(last_demands[-7:])) if len(last_demands) >= 7 else 1.0
            rolling_14 = float(np.mean(last_demands[-14:])) if len(last_demands) >= 14 else rolling_7

            feature_dict = {
                "product_id": product_id,
                "warehouse_id": warehouse_id,
                "day_of_week": current_dt.dayofweek,
                "day_of_month": current_dt.day,
                "month": current_dt.month,
                "is_weekend": int(current_dt.dayofweek in [5, 6]),
                "quarter": current_dt.quarter,
                "lag_1": lag_1,
                "lag_2": lag_2,
                "lag_3": lag_3,
                "lag_7": lag_7,
                "lag_14": lag_14,
                "rolling_mean_7": rolling_7,
                "rolling_std_7": rolling_std_7,
                "rolling_mean_14": rolling_14,
            }

            input_row = pd.DataFrame([feature_dict])[self.features]

            if self.model is not None:
                step_pred = float(self.model.predict(input_row)[0])
            else:
                dow_weight = 1.2 if current_dt.dayofweek in (4, 5) else 1.0
                step_pred = rolling_7 * 0.7 + lag_7 * 0.3 * dow_weight

            step_pred = max(0.0, round(step_pred, 1))

            horizon_factor = np.sqrt(1 + 0.08 * step)
            margin = z_score * self.residual_std * horizon_factor
            lower_bound = max(0.0, round(step_pred - margin, 1))
            upper_bound = round(step_pred + margin, 1)

            predictions.append(
                {
                    "date": current_target_date.isoformat(),
                    "day_of_week": current_dt.strftime("%A"),
                    "predicted_demand": step_pred,
                    "lower_bound": lower_bound,
                    "upper_bound": upper_bound,
                }
            )

            new_row = pd.DataFrame(
                [
                    {
                        "date": current_dt,
                        "product_id": product_id,
                        "warehouse_id": warehouse_id,
                        "demand": step_pred,
                    }
                ]
            )
            working_df = pd.concat([working_df, new_row], ignore_index=True)

        return predictions

    def save(self, file_path: Path) -> None:
        """Ghi artifact atomic + sidecar metadata JSON (Sprint8-08)."""
        payload = {
            "model": self.model,
            "model_type": self.model_type,
            "features": self.features,
            "metrics": self.metrics,
            "version": self.version,
            "trained_at": self.trained_at,
            "residual_std": self.residual_std,
        }
        atomic_dump(payload, file_path)
        write_metadata(file_path, {
            "model_name": file_path.name,
            "model_type": self.model_type,
            "version": self.version,
            "trained_at": self.trained_at,
            "metrics": self.metrics,
            "features": self.features,
        })

    @classmethod
    def load(cls, file_path: Path) -> "DemandForecastPipeline":
        """Nạp và kiểm tra artifact; ném FileNotFoundError / ValueError nếu không dùng được."""
        if not file_path.exists():
            raise FileNotFoundError(f"Model file not found at: {file_path}")
        try:
            payload = joblib.load(file_path)
        except Exception as exc:
            raise ValueError(f"Không đọc được file model {file_path.name}: {exc}") from exc
        validate_payload(payload)

        pipeline = cls(model_type=payload.get("model_type", "random_forest"))
        pipeline.model = payload["model"]
        pipeline.features = payload["features"]
        pipeline.metrics = payload.get("metrics", {})
        pipeline.version = payload.get("version", "1.0.0")
        pipeline.trained_at = payload.get("trained_at")
        pipeline.residual_std = payload.get("residual_std", 2.5)
        return pipeline

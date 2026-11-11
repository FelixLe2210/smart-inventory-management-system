from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor, RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

from app.ml.feature_engineering import FEATURE_COLUMNS, LEVEL_WINDOW, MIN_LEVEL, build_feature_frame
from app.ml.model_store import atomic_dump, validate_payload, write_metadata


MODEL_VERSION = "2.0.0"  # 2.x = scale-free (demand/level) features; 1.x artifacts are rejected on load


def _use_single_thread_inference(model: Any) -> None:
    """Dự báo từng hàng một: với ``n_jobs=-1`` RandomForest dựng/tắt cả nhóm luồng mỗi lần ``predict`` (~40 ms/lần,
    dự báo nhiều bước gọi hàng chục lần). Chạy 1 luồng nhanh hơn nhiều; huấn luyện vẫn song song vì đặt trước ``fit``."""
    if hasattr(model, "n_jobs"):
        model.n_jobs = 1


class DemandForecastPipeline:
    """End-to-end Demand Forecasting training and inference pipeline."""

    def __init__(self, model_type: str = "random_forest"):
        self.model_type = model_type.lower()
        self.model: Optional[Any] = None
        self.features: List[str] = FEATURE_COLUMNS
        self.metrics: Dict[str, float] = {}
        self.version: str = MODEL_VERSION
        self.trained_at: Optional[str] = None
        self.residual_std: float = 0.2  # RELATIVE error (std of demand/level residuals)

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
        """Fit on history with a CHRONOLOGICAL hold-out: the last ``test_size`` share of
        the calendar days is the test set for every product/warehouse series.

        (Splitting by row position would be wrong here: rows are ordered by series first,
        so the "test set" would be a few whole products instead of the most recent days.)
        """
        frame = build_feature_frame(df, target_col="demand", drop_na=True)
        if len(frame) < 20:
            raise ValueError(f"Insufficient training samples ({len(frame)} samples, minimum 20 required).")

        self.features = list(FEATURE_COLUMNS)

        days = np.sort(frame["date"].unique())
        n_test_days = max(1, int(round(len(days) * test_size)))
        if n_test_days >= len(days):
            raise ValueError("Not enough distinct days to hold out a test period.")
        cutoff = days[-n_test_days - 1]  # last day that still belongs to training
        train_mask = frame["date"] <= cutoff
        train_df, test_df = frame[train_mask], frame[~train_mask]
        if len(train_df) < 10 or test_df.empty:
            raise ValueError("Chronological split produced an empty train or test set.")

        X_train, y_train = train_df[self.features], train_df["target_ratio"]
        X_test, y_test = test_df[self.features], test_df["demand"]

        self.model = self._init_model()
        self.model.fit(X_train, y_train)
        _use_single_thread_inference(self.model)

        # the model predicts demand / level; convert back to units before scoring
        y_pred = np.maximum(0.0, self.model.predict(X_test) * test_df["level"].to_numpy())
        mae = float(mean_absolute_error(y_test, y_pred))
        rmse = float(np.sqrt(mean_squared_error(y_test, y_pred)))
        r2 = float(r2_score(y_test, y_pred))

        non_zero = (y_test > 0.1).to_numpy()
        if non_zero.any():
            mape = float(np.mean(np.abs((y_test.to_numpy()[non_zero] - y_pred[non_zero]) / y_test.to_numpy()[non_zero])) * 100)
        else:
            mape = 0.0
        total_actual = float(np.abs(y_test).sum())
        wape = float(np.abs(y_test.to_numpy() - y_pred).sum() / total_actual * 100) if total_actual > 0 else 0.0
        # Reference point: "same weekday last week". A useful model must beat it.
        baseline_mae = float(mean_absolute_error(y_test, test_df["lag_7"] * test_df["level"]))

        # relative error, so intervals scale with the product's own volume
        rel_residuals = (y_test.to_numpy() - y_pred) / test_df["level"].to_numpy()
        self.residual_std = max(0.02, float(np.std(rel_residuals)))

        self.metrics = {
            "mae": round(mae, 3),
            "rmse": round(rmse, 3),
            "r2": round(r2, 3),
            "mape": round(mape, 2),
            "wape": round(wape, 2),
            "baseline_mae": round(baseline_mae, 3),
            "test_rows": float(len(test_df)),
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

            last_demands = working_df["demand"].tolist()
            level = max(MIN_LEVEL, float(np.mean(last_demands[-LEVEL_WINDOW:])))

            lag_1 = last_demands[-1] if len(last_demands) >= 1 else level
            lag_2 = last_demands[-2] if len(last_demands) >= 2 else lag_1
            lag_3 = last_demands[-3] if len(last_demands) >= 3 else lag_2
            lag_7 = last_demands[-7] if len(last_demands) >= 7 else lag_1
            lag_14 = last_demands[-14] if len(last_demands) >= 14 else lag_7

            rolling_7 = float(np.mean(last_demands[-7:])) if len(last_demands) >= 7 else lag_1
            rolling_std_7 = float(np.std(last_demands[-7:], ddof=1)) if len(last_demands) >= 7 else 0.0  # same ddof=1 as training
            rolling_14 = float(np.mean(last_demands[-14:])) if len(last_demands) >= 14 else rolling_7

            feature_dict = {
                "day_of_week": current_dt.dayofweek,
                "day_of_month": current_dt.day,
                "month": current_dt.month,
                "is_weekend": int(current_dt.dayofweek in [5, 6]),
                "quarter": current_dt.quarter,
                "lag_1": lag_1 / level,
                "lag_2": lag_2 / level,
                "lag_3": lag_3 / level,
                "lag_7": lag_7 / level,
                "lag_14": lag_14 / level,
                "rolling_mean_7": rolling_7 / level,
                "rolling_std_7": rolling_std_7 / level,
                "rolling_mean_14": rolling_14 / level,
            }

            input_row = pd.DataFrame([feature_dict])[self.features]

            if self.model is not None:
                step_pred = float(self.model.predict(input_row)[0]) * level
            else:
                dow_weight = 1.2 if current_dt.dayofweek in (4, 5) else 1.0
                step_pred = rolling_7 * 0.7 + lag_7 * 0.3 * dow_weight

            step_pred = max(0.0, round(step_pred, 1))

            horizon_factor = np.sqrt(1 + 0.08 * step)
            # error grows with the product's volume but never below Poisson noise (variance ~ level)
            sigma = max(self.residual_std * level, float(np.sqrt(level)))
            margin = z_score * sigma * horizon_factor
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
        """Ghi artifact atomic + sidecar metadata JSON."""
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
        if not str(payload.get("version", "")).startswith("2."):
            raise ValueError(
                f"Model {file_path.name} was trained with the old raw-unit features (version "
                f"{payload.get('version')}); retrain it."
            )

        pipeline = cls(model_type=payload.get("model_type", "random_forest"))
        pipeline.model = payload["model"]
        _use_single_thread_inference(pipeline.model)
        pipeline.features = payload["features"]
        pipeline.metrics = payload.get("metrics", {})
        pipeline.version = payload.get("version", "1.0.0")
        pipeline.trained_at = payload.get("trained_at")
        pipeline.residual_std = payload.get("residual_std", 0.2)
        return pipeline

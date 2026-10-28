"""Sprint 8 M1 – compare forecast baselines and candidate models on a time holdout."""
import argparse
import importlib.util
import json
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import GradientBoostingRegressor, RandomForestRegressor
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import OneHotEncoder

from .common import KEY, PROCESSED_DIR, TARGET, TEST_FILE, TRAIN_FILE, ensure_dirs
from .s05_calendar_features import add_calendar_features

CALENDAR_FEATURES = [
    "year",
    "month",
    "day",
    "quarter",
    "is_weekend",
    "day_of_week_sin",
    "day_of_week_cos",
    "month_sin",
    "month_cos",
    "day_of_year_sin",
    "day_of_year_cos",
]
LAG_FEATURES = [
    "lag_1",
    "lag_7",
    "lag_14",
    "lag_28",
    "rolling_mean_7",
    "rolling_mean_28",
    "rolling_std_7",
    "rolling_std_28",
]
CATEGORY_COLUMNS = ["sku", "warehouse_code"]
REQUIRED_COLUMNS = {"date", *KEY, TARGET}


def _validate_inputs(train: pd.DataFrame, test: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame]:
    for name, frame in (("train", train), ("test", test)):
        missing = REQUIRED_COLUMNS - set(frame.columns)
        if missing:
            raise ValueError(f"{name} thiếu cột bắt buộc: {sorted(missing)}")
        if frame.empty:
            raise ValueError(f"{name} không được rỗng.")

    train = train.copy()
    test = test.copy()
    for name, frame in (("train", train), ("test", test)):
        frame["date"] = pd.to_datetime(frame["date"], errors="coerce")
        frame[TARGET] = pd.to_numeric(frame[TARGET], errors="raise")
        if frame["date"].isna().any():
            raise ValueError(f"{name} chứa ngày không hợp lệ.")
        if frame[[*KEY, TARGET]].isna().any().any():
            raise ValueError(f"{name} chứa khóa chuỗi hoặc nhu cầu bị thiếu.")
        if not np.isfinite(frame[TARGET].to_numpy(dtype=float)).all() or (frame[TARGET] < 0).any():
            raise ValueError(f"{name} chứa nhu cầu âm hoặc không hữu hạn.")
        if frame.duplicated(["date", *KEY]).any():
            raise ValueError(f"{name} có khóa (ngày, SKU, kho) trùng.")

    if train["date"].max() >= test["date"].min():
        raise ValueError("Train/test chồng lấn thời gian hoặc bị rò rỉ tương lai.")
    train_keys = set(map(tuple, train[KEY].drop_duplicates().to_numpy()))
    test_keys = set(map(tuple, test[KEY].drop_duplicates().to_numpy()))
    if test_keys - train_keys:
        raise ValueError(f"Test có chuỗi cold-start không có trong train: {sorted(test_keys - train_keys)}")

    return train.sort_values([*KEY, "date"]).reset_index(drop=True), test.sort_values(
        [*KEY, "date"]
    ).reset_index(drop=True)


def _make_features(train: pd.DataFrame, test: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Create lag features from past observations only, including walk-forward test history."""
    train_part = train.assign(_partition="train")
    test_part = test.assign(_partition="test")
    combined = pd.concat([train_part, test_part], ignore_index=True)
    combined = add_calendar_features(combined)
    combined = combined.sort_values([*KEY, "date"]).reset_index(drop=True)

    grouped = combined.groupby(KEY, sort=False)[TARGET]
    for lag in (1, 7, 14, 28):
        combined[f"lag_{lag}"] = grouped.shift(lag)
    for window in (7, 28):
        combined[f"rolling_mean_{window}"] = combined.groupby(KEY, sort=False)[TARGET].transform(
            lambda values: values.shift(1).rolling(window, min_periods=window).mean()
        )
        combined[f"rolling_std_{window}"] = combined.groupby(KEY, sort=False)[TARGET].transform(
            lambda values: values.shift(1).rolling(window, min_periods=window).std().fillna(0.0)
        )

    required_features = [*CALENDAR_FEATURES, *LAG_FEATURES]
    train_features = combined.loc[combined["_partition"] == "train"].dropna(
        subset=required_features
    ).copy()
    test_features = combined.loc[combined["_partition"] == "test"].dropna(
        subset=required_features
    ).copy()
    if train_features.empty or test_features.empty:
        raise ValueError("Không đủ lịch sử để tạo feature lag/rolling; cần ít nhất 28 ngày train.")
    if len(test_features) != len(test):
        raise ValueError("Không tạo được feature cho toàn bộ test set; kiểm tra độ liên tục của dữ liệu.")
    return train_features.reset_index(drop=True), test_features.reset_index(drop=True)


def _metrics(actual: pd.Series, predicted: np.ndarray) -> dict:
    actual_values = actual.to_numpy(dtype=float)
    predicted_values = np.maximum(0.0, np.asarray(predicted, dtype=float))
    errors = np.abs(actual_values - predicted_values)
    nonzero = actual_values > 0
    denominator = float(np.abs(actual_values).sum())
    return {
        "rows": int(len(actual_values)),
        "mae": round(float(errors.mean()), 4),
        "rmse": round(float(np.sqrt(np.mean(np.square(errors)))), 4),
        "mape": round(float(np.mean(errors[nonzero] / actual_values[nonzero]) * 100), 4)
        if nonzero.any()
        else None,
        "mape_rows": int(nonzero.sum()),
        "wape": round(float(errors.sum() / denominator), 6) if denominator else None,
    }


def _estimator_pipeline(model, numeric_features: list[str]):
    transform = ColumnTransformer(
        [
            ("series", OneHotEncoder(handle_unknown="ignore"), CATEGORY_COLUMNS),
            ("numeric", "passthrough", numeric_features),
        ]
    )
    return make_pipeline(transform, model)


def _append_predictions(
    prediction_frames: list[pd.DataFrame],
    model_name: str,
    actual_frame: pd.DataFrame,
    predicted: np.ndarray,
) -> None:
    output = actual_frame[["date", *KEY, TARGET]].copy()
    output = output.rename(columns={TARGET: "actual"})
    output["model"] = model_name
    output["predicted"] = np.maximum(0.0, np.asarray(predicted, dtype=float))
    prediction_frames.append(output)


def _prophet_predictions(train: pd.DataFrame, test: pd.DataFrame) -> np.ndarray:
    from prophet import Prophet

    predictions = pd.Series(index=test.index, dtype=float)
    for key, test_group in test.groupby(KEY, sort=False):
        key = key if isinstance(key, tuple) else (key,)
        train_mask = pd.Series(True, index=train.index)
        for column, value in zip(KEY, key):
            train_mask &= train[column].eq(value)
        train_group = train.loc[train_mask]
        model = Prophet()
        model.fit(train_group.rename(columns={"date": "ds", TARGET: "y"})[["ds", "y"]])
        future = test_group[["date"]].rename(columns={"date": "ds"})
        values = model.predict(future)["yhat"].to_numpy(dtype=float)
        predictions.loc[test_group.index] = values
    return predictions.loc[test.index].to_numpy(dtype=float)


def evaluate_models(train: pd.DataFrame, test: pd.DataFrame) -> tuple[pd.DataFrame, dict]:
    """Score common baselines and candidates on the same chronological holdout."""
    train, test = _validate_inputs(train, test)
    train_features, test_features = _make_features(train, test)
    predictions = []
    model_results = {}
    actual = test_features[TARGET]

    weekday_means = train.assign(_weekday=train["date"].dt.dayofweek).groupby(
        [*KEY, "_weekday"]
    )[TARGET].mean()
    series_means = train.groupby(KEY)[TARGET].mean()

    baseline_values = {
        "seasonal_naive_7d": test_features["lag_7"].to_numpy(dtype=float),
        "weekday_mean": np.array(
            [
                weekday_means.get(
                    (row.sku, row.warehouse_code, pd.Timestamp(row.date).dayofweek),
                    series_means.get((row.sku, row.warehouse_code)),
                )
                for row in test_features.itertuples()
            ],
            dtype=float,
        ),
    }
    for name, values in baseline_values.items():
        values = np.maximum(0.0, values)
        model_results[name] = {"status": "evaluated", "metrics": _metrics(actual, values)}
        _append_predictions(predictions, name, test_features, values)

    model_specs = [
        (
            "random_forest_calendar",
            CALENDAR_FEATURES,
            RandomForestRegressor(
                n_estimators=100, max_depth=12, min_samples_split=4, random_state=42, n_jobs=-1
            ),
        ),
        (
            "random_forest_engineered",
            [*CALENDAR_FEATURES, *LAG_FEATURES],
            RandomForestRegressor(
                n_estimators=100, max_depth=12, min_samples_split=4, random_state=42, n_jobs=-1
            ),
        ),
        (
            "gradient_boosting_engineered",
            [*CALENDAR_FEATURES, *LAG_FEATURES],
            GradientBoostingRegressor(
                n_estimators=100, learning_rate=0.05, max_depth=3, random_state=42
            ),
        ),
    ]

    if importlib.util.find_spec("xgboost") is not None:
        from xgboost import XGBRegressor

        model_specs.append(
            (
                "xgboost_engineered",
                [*CALENDAR_FEATURES, *LAG_FEATURES],
                XGBRegressor(
                    n_estimators=300,
                    max_depth=5,
                    learning_rate=0.05,
                    subsample=0.8,
                    colsample_bytree=0.8,
                    objective="reg:squarederror",
                    random_state=42,
                    n_jobs=-1,
                ),
            )
        )
    else:
        model_results["xgboost_engineered"] = {
            "status": "unavailable",
            "reason": "Optional dependency 'xgboost' is not installed.",
            "metrics": None,
        }

    for name, feature_columns, estimator in model_specs:
        model = _estimator_pipeline(estimator, feature_columns)
        model.fit(train_features[[*CATEGORY_COLUMNS, *feature_columns]], train_features[TARGET])
        values = np.maximum(
            0.0, model.predict(test_features[[*CATEGORY_COLUMNS, *feature_columns]])
        )
        model_results[name] = {"status": "evaluated", "metrics": _metrics(actual, values)}
        _append_predictions(predictions, name, test_features, values)

    if importlib.util.find_spec("prophet") is not None:
        prophet_train = train.groupby(KEY, sort=False).size()
        if prophet_train.min() >= 60:
            values = np.maximum(0.0, _prophet_predictions(train, test))
            model_results["prophet"] = {
                "status": "evaluated",
                "metrics": _metrics(actual, values),
            }
            _append_predictions(predictions, "prophet", test_features, values)
        else:
            model_results["prophet"] = {
                "status": "not_suitable",
                "reason": "Prophet evaluation requires at least 60 training observations per series.",
                "metrics": None,
            }
    else:
        model_results["prophet"] = {
            "status": "unavailable",
            "reason": "Optional dependency 'prophet' is not installed.",
            "metrics": None,
        }

    ranking = sorted(
        (
            {"model": name, "mae": result["metrics"]["mae"]}
            for name, result in model_results.items()
            if result["status"] == "evaluated"
        ),
        key=lambda item: (item["mae"], item["model"]),
    )
    report = {
        "evaluation": "chronological_walk_forward_one_day_ahead",
        "train_max_date": str(train["date"].max().date()),
        "test_min_date": str(test["date"].min().date()),
        "test_max_date": str(test["date"].max().date()),
        "series_count": int(test[KEY].drop_duplicates().shape[0]),
        "scored_rows": int(len(test_features)),
        "scored_imputed_rows": int(
            test_features["is_imputed"].sum()
        ) if "is_imputed" in test_features else 0,
        "models_ranked_by_mae": ranking,
        "models": model_results,
        "feature_sets": {
            "random_forest_calendar": CALENDAR_FEATURES,
            "random_forest_engineered": [*CALENDAR_FEATURES, *LAG_FEATURES],
        },
        "notes": [
            "All evaluated models use the same chronological test rows.",
            "Lag and rolling features use only earlier observations; test actuals become available for the next one-day-ahead forecast.",
            "MAPE excludes zero-actual rows; MAE and WAPE are included for intermittent demand.",
            "Metrics include imputed test rows; scored_imputed_rows records their count.",
            "Current project data is synthetic; results validate the evaluation pipeline, not real-world accuracy.",
            "XGBoost and Prophet are optional and are reported as unavailable when not installed.",
        ],
    }
    prediction_frame = pd.concat(predictions, ignore_index=True).sort_values(
        ["model", *KEY, "date"]
    ).reset_index(drop=True)
    return prediction_frame, report


def main(argv=None) -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--train", type=Path, default=TRAIN_FILE)
    parser.add_argument("--test", type=Path, default=TEST_FILE)
    parser.add_argument("--output-dir", type=Path, default=PROCESSED_DIR)
    args = parser.parse_args(argv)

    ensure_dirs()
    train = pd.read_csv(args.train, parse_dates=["date"])
    test = pd.read_csv(args.test, parse_dates=["date"])
    prediction_frame, report = evaluate_models(train, test)
    args.output_dir.mkdir(parents=True, exist_ok=True)
    metrics_path = args.output_dir / "model_comparison_metrics.json"
    predictions_path = args.output_dir / "model_comparison_predictions.csv"
    metrics_path.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    prediction_frame.to_csv(predictions_path, index=False)
    print(json.dumps(report, indent=2, ensure_ascii=False))
    print(f"-> {metrics_path}\n-> {predictions_path}")


if __name__ == "__main__":
    main()

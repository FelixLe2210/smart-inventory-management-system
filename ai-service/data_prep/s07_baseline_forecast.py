"""Sprint7-07 – Baseline dự báo tuần và trung bình, chỉ dùng dữ liệu train."""
import json

import numpy as np
import pandas as pd

from .common import KEY, PROCESSED_DIR, TARGET, TEST_FILE, TRAIN_FILE, ensure_dirs


def _metrics(actual: pd.Series, predicted: pd.Series) -> dict:
    errors = (actual.astype(float) - predicted.astype(float)).abs()
    denominator = float(actual.astype(float).abs().sum())
    return {
        "rows": int(len(actual)),
        "mae": float(errors.mean()) if len(errors) else None,
        "wape": float(errors.sum() / denominator) if denominator else None,
    }


def evaluate_baselines(train: pd.DataFrame, test: pd.DataFrame) -> tuple[pd.DataFrame, dict]:
    required = {"date", *KEY, TARGET}
    for name, frame in (("train", train), ("test", test)):
        missing = required - set(frame.columns)
        if missing:
            raise ValueError(f"{name} thiếu cột bắt buộc: {sorted(missing)}")

    train = train.copy()
    test = test.copy()
    train["date"] = pd.to_datetime(train["date"], errors="coerce")
    test["date"] = pd.to_datetime(test["date"], errors="coerce")
    if train["date"].isna().any() or test["date"].isna().any():
        raise ValueError("Train/test chứa ngày không hợp lệ.")
    if train.empty or test.empty:
        raise ValueError("Train và test đều phải có dữ liệu.")
    if train["date"].max() >= test["date"].min():
        raise ValueError("Train/test chồng lấn thời gian hoặc bị rò rỉ tương lai.")

    train[TARGET] = pd.to_numeric(train[TARGET], errors="raise")
    test[TARGET] = pd.to_numeric(test[TARGET], errors="raise")
    predictions = []
    for key, test_series in test.groupby(KEY, sort=True):
        key = key if isinstance(key, tuple) else (key,)
        mask = pd.Series(True, index=train.index)
        for column, value in zip(KEY, key):
            mask &= train[column].eq(value)
        history = train.loc[mask].sort_values("date")
        if history.empty:
            raise ValueError(f"Test có chuỗi cold-start không có trong train: {key}")
        recent_week = history.tail(7)
        weekday_mean = history.assign(_weekday=history["date"].dt.dayofweek).groupby("_weekday")[TARGET].mean()
        overall_mean = float(history[TARGET].mean())
        output = test_series.sort_values("date").copy()
        output["seasonal_naive_7d"] = [
            float(recent_week.iloc[i % len(recent_week)][TARGET]) for i in range(len(output))
        ]
        output["weekday_mean"] = output["date"].dt.dayofweek.map(weekday_mean).fillna(overall_mean).astype(float)
        predictions.append(output)

    result = pd.concat(predictions).sort_values([*KEY, "date"]).reset_index(drop=True)
    metrics = {
        "evaluation": "time_based_holdout",
        "train_max_date": str(train["date"].max().date()),
        "test_min_date": str(test["date"].min().date()),
        "models": {
            name: _metrics(result[TARGET], result[name])
            for name in ("seasonal_naive_7d", "weekday_mean")
        },
        "notes": [
            "Predictions are created from train only; test is used only for scoring.",
            "Synthetic data results validate the pipeline and are not evidence of real-world accuracy.",
            "MAPE is omitted because intermittent demand can contain zero actuals; use MAE/WAPE.",
        ],
    }
    return result, metrics


def main():
    ensure_dirs()
    train = pd.read_csv(TRAIN_FILE)
    test = pd.read_csv(TEST_FILE)
    predictions, metrics = evaluate_baselines(train, test)
    predictions_file = PROCESSED_DIR / "baseline_predictions.csv"
    metrics_file = PROCESSED_DIR / "baseline_metrics.json"
    predictions.to_csv(predictions_file, index=False)
    metrics_file.write_text(json.dumps(metrics, indent=2, ensure_ascii=False), encoding="utf-8")
    print(json.dumps(metrics, indent=2, ensure_ascii=False))
    print(f"-> {predictions_file}\n-> {metrics_file}")


if __name__ == "__main__":
    main()

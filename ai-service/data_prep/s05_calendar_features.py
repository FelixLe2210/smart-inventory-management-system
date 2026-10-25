"""Sprint7-05 – Tạo feature lịch nhất quán cho train và test."""
import json

import numpy as np
import pandas as pd

from .common import PROCESSED_DIR, TEST_FILE, TRAIN_FILE, ensure_dirs

CALENDAR_FEATURES = [
    "year", "month", "day", "day_of_week", "day_of_year", "week_of_year", "quarter",
    "is_weekend", "day_of_week_sin", "day_of_week_cos", "month_sin", "month_cos",
    "day_of_year_sin", "day_of_year_cos",
]


def add_calendar_features(frame: pd.DataFrame) -> pd.DataFrame:
    if "date" not in frame:
        raise ValueError("Dataset phải có cột 'date'.")
    result = frame.copy()
    dates = pd.to_datetime(result["date"], errors="coerce")
    if dates.isna().any():
        raise ValueError("Cột 'date' có giá trị không hợp lệ.")

    weekday = dates.dt.dayofweek
    month = dates.dt.month
    day_of_year = dates.dt.dayofyear
    iso_week = dates.dt.isocalendar().week.astype(int)
    result["date"] = dates.dt.strftime("%Y-%m-%d")
    result["year"] = dates.dt.year
    result["month"] = month
    result["day"] = dates.dt.day
    result["day_of_week"] = weekday
    result["day_of_year"] = day_of_year
    result["week_of_year"] = iso_week
    result["quarter"] = dates.dt.quarter
    result["is_weekend"] = weekday.isin([5, 6]).astype(int)
    result["day_of_week_sin"] = np.sin(2 * np.pi * weekday / 7)
    result["day_of_week_cos"] = np.cos(2 * np.pi * weekday / 7)
    result["month_sin"] = np.sin(2 * np.pi * (month - 1) / 12)
    result["month_cos"] = np.cos(2 * np.pi * (month - 1) / 12)
    result["day_of_year_sin"] = np.sin(2 * np.pi * (day_of_year - 1) / 365.25)
    result["day_of_year_cos"] = np.cos(2 * np.pi * (day_of_year - 1) / 365.25)

    return result


def main():
    ensure_dirs()

    for source, destination in (
        (TRAIN_FILE, PROCESSED_DIR / "train_features.csv"),
        (TEST_FILE, PROCESSED_DIR / "test_features.csv"),
    ):
        frame = add_calendar_features(pd.read_csv(source))
        frame.to_csv(destination, index=False)
        print(f"-> {destination}")

    metadata = {
        "feature_columns": CALENDAR_FEATURES,
        "fit_on_train_only": True,
    }
    (PROCESSED_DIR / "calendar_features.json").write_text(
        json.dumps(metadata, indent=2, ensure_ascii=False), encoding="utf-8"
    )


if __name__ == "__main__":
    main()

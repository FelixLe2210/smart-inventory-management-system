from typing import List, Optional, Tuple
import numpy as np
import pandas as pd

FEATURE_COLUMNS = [
    "product_id",
    "warehouse_id",
    "day_of_week",
    "day_of_month",
    "month",
    "is_weekend",
    "quarter",
    "lag_1",
    "lag_2",
    "lag_3",
    "lag_7",
    "lag_14",
    "rolling_mean_7",
    "rolling_std_7",
    "rolling_mean_14",
]


def add_calendar_features(df: pd.DataFrame, date_col: str = "date") -> pd.DataFrame:
    """Extract temporal attributes from date column."""
    df = df.copy()
    dates = pd.to_datetime(df[date_col])
    df["day_of_week"] = dates.dt.dayofweek
    df["day_of_month"] = dates.dt.day
    df["month"] = dates.dt.month
    df["is_weekend"] = dates.dt.dayofweek.isin([5, 6]).astype(int)
    df["quarter"] = dates.dt.quarter
    return df


def add_lag_features(
    df: pd.DataFrame,
    group_cols: Optional[List[str]] = None,
    target_col: str = "demand",
    lags: Optional[List[int]] = None,
) -> pd.DataFrame:
    """Create lagged demand values."""
    if lags is None:
        lags = [1, 2, 3, 7, 14]
    if group_cols is None:
        group_cols = ["product_id", "warehouse_id"]

    df = df.copy()
    df = df.sort_values(by=group_cols + ["date"]).reset_index(drop=True)

    grouped = df.groupby(group_cols, group_keys=False)
    for lag in lags:
        df[f"lag_{lag}"] = grouped[target_col].shift(lag)

    return df


def add_rolling_features(
    df: pd.DataFrame,
    group_cols: Optional[List[str]] = None,
    target_col: str = "demand",
    windows: Optional[List[int]] = None,
) -> pd.DataFrame:
    """Compute rolling window summary statistics on lag 1 to avoid lookahead bias."""
    if windows is None:
        windows = [7, 14]
    if group_cols is None:
        group_cols = ["product_id", "warehouse_id"]

    df = df.copy()
    grouped = df.groupby(group_cols, group_keys=False)

    for w in windows:
        # Use shift(1) to avoid data leakage
        shifted = grouped[target_col].shift(1)
        df[f"rolling_mean_{w}"] = shifted.rolling(window=w, min_periods=1).mean()
        df[f"rolling_std_{w}"] = (
            shifted.rolling(window=w, min_periods=1).std().fillna(0.0)
        )

    return df


def build_feature_matrix(
    df: pd.DataFrame,
    target_col: str = "demand",
    drop_na: bool = True,
) -> Tuple[pd.DataFrame, Optional[pd.Series], List[str]]:
    """Transform raw transaction/demand time-series into ML feature matrix."""
    df = df.copy()
    if "warehouse_id" not in df.columns:
        df["warehouse_id"] = 1

    df = add_calendar_features(df, "date")
    df = add_lag_features(df, group_cols=["product_id", "warehouse_id"], target_col=target_col)
    df = add_rolling_features(df, group_cols=["product_id", "warehouse_id"], target_col=target_col)

    if drop_na:
        # Drop rows where lag features are NaN (initial history warm-up)
        df = df.dropna(subset=[col for col in FEATURE_COLUMNS if col in df.columns]).reset_index(drop=True)
    else:
        # Fill missing values with median / 0 for inference
        for col in FEATURE_COLUMNS:
            if col in df.columns:
                df[col] = df[col].fillna(0.0)

    X = df[FEATURE_COLUMNS].copy()
    y = df[target_col].copy() if target_col in df.columns else None

    return X, y, FEATURE_COLUMNS

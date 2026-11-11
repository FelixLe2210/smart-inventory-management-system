from typing import List, Optional, Tuple
import numpy as np
import pandas as pd

# Scale-free features. Demand-valued columns (lags, rolling stats) are divided by the series'
# own level (mean of the previous LEVEL_WINDOW days) and the model predicts the demand/level
# ratio. A tree model cannot predict outside the target range it saw in training, so learning raw
# units made a 3 units/day product forecast ~10 and a 200 units/day product ~83.
# product_id / warehouse_id are NOT features: numeric ids carry no meaning and block new products.
LEVEL_WINDOW = 28
MIN_LEVEL = 0.1
RATIO_COLUMNS = [
    "lag_1", "lag_2", "lag_3", "lag_7", "lag_14",
    "rolling_mean_7", "rolling_std_7", "rolling_mean_14",
]

FEATURE_COLUMNS = [
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
    """Rolling statistics of the PAST demand, computed separately for every series.

    The window is shifted by one day (no look-ahead) and is applied inside each
    (product, warehouse) group, so the first rows of a series never borrow values
    from the previous series. ``rolling_std`` uses ``ddof=1`` (pandas default); the
    inference code in ``DemandForecastPipeline`` uses the same convention.
    """
    if windows is None:
        windows = [7, 14]
    if group_cols is None:
        group_cols = ["product_id", "warehouse_id"]

    df = df.copy()
    grouped = df.groupby(group_cols, group_keys=False)[target_col]

    for w in windows:
        df[f"rolling_mean_{w}"] = grouped.transform(
            lambda s, w=w: s.shift(1).rolling(window=w, min_periods=1).mean()
        )
        df[f"rolling_std_{w}"] = grouped.transform(
            lambda s, w=w: s.shift(1).rolling(window=w, min_periods=1).std().fillna(0.0)
        )

    return df


def add_level(df: pd.DataFrame, group_cols: Optional[List[str]] = None, target_col: str = "demand") -> pd.DataFrame:
    """Per-series demand level: mean of the previous ``LEVEL_WINDOW`` days (no look-ahead)."""
    if group_cols is None:
        group_cols = ["product_id", "warehouse_id"]
    df = df.copy()
    df["level"] = df.groupby(group_cols, group_keys=False)[target_col].transform(
        lambda s: s.shift(1).rolling(window=LEVEL_WINDOW, min_periods=14).mean()
    )
    return df


def build_feature_frame(
    df: pd.DataFrame,
    target_col: str = "demand",
    drop_na: bool = True,
) -> pd.DataFrame:
    """Full feature table INCLUDING ``date`` (needed for a chronological split)."""
    df = df.copy()
    if "warehouse_id" not in df.columns:
        df["warehouse_id"] = 1

    df = add_calendar_features(df, "date")
    df = add_lag_features(df, group_cols=["product_id", "warehouse_id"], target_col=target_col)
    df = add_rolling_features(df, group_cols=["product_id", "warehouse_id"], target_col=target_col)
    df = add_level(df, group_cols=["product_id", "warehouse_id"], target_col=target_col)

    if drop_na:
        # Drop rows where lag/level features are NaN (initial history warm-up)
        df = df.dropna(subset=RATIO_COLUMNS + ["level"]).reset_index(drop=True)
    else:
        for col in RATIO_COLUMNS + ["level"]:
            df[col] = df[col].fillna(0.0)

    df["level"] = df["level"].clip(lower=MIN_LEVEL)
    for col in RATIO_COLUMNS:
        df[col] = df[col] / df["level"]
    if target_col in df.columns:
        df["target_ratio"] = df[target_col] / df["level"]
    return df


def build_feature_matrix(
    df: pd.DataFrame,
    target_col: str = "demand",
    drop_na: bool = True,
) -> Tuple[pd.DataFrame, Optional[pd.Series], List[str]]:
    """Transform raw transaction/demand time-series into ML feature matrix."""
    df = build_feature_frame(df, target_col=target_col, drop_na=drop_na)
    X = df[FEATURE_COLUMNS].copy()
    y = df[target_col].copy() if target_col in df.columns else None
    return X, y, FEATURE_COLUMNS

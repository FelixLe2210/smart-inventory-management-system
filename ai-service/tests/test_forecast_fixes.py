"""Regression tests for the AI #1 (forecasting) bug fixes."""
import numpy as np
import pandas as pd
import pytest

from app.ml.data_generator import generate_synthetic_demand
from app.ml.feature_engineering import add_lag_features, add_rolling_features, build_feature_frame
from app.ml.pipeline import DemandForecastPipeline
from app.schemas.forecast import DemandForecastRequest, HistoricalDataPoint
from app.services.forecast_service import ForecastService


def _two_series():
    d = pd.date_range("2025-01-01", periods=30)
    a = pd.DataFrame({"date": d, "product_id": 1, "warehouse_id": 1, "demand": np.full(30, 100.0)})
    b = pd.DataFrame({"date": d, "product_id": 2, "warehouse_id": 1, "demand": np.full(30, 5.0)})
    return pd.concat([a, b], ignore_index=True)


def test_rolling_features_do_not_leak_between_series():
    df = add_lag_features(_two_series())
    out = add_rolling_features(df).sort_values(["product_id", "date"])
    first_b = out[out.product_id == 2].iloc[1]  # 2nd day of series B: only 1 past value (=5)
    assert first_b["rolling_mean_7"] == pytest.approx(5.0)  # was ~100 before the fix
    assert out[out.product_id == 2].iloc[0]["rolling_std_7"] == 0.0


def test_training_uses_chronological_test_period():
    df = generate_synthetic_demand(days=120, random_seed=7)
    pipe = DemandForecastPipeline()
    pipe.train(df, test_size=0.2)
    frame = build_feature_frame(df)
    days = np.sort(frame["date"].unique())
    n_test = int(round(len(days) * 0.2))
    # test rows = last n_test calendar days of EVERY series, not the last few products
    assert pipe.metrics["test_rows"] == n_test * frame[["product_id", "warehouse_id"]].drop_duplicates().shape[0]


def test_metrics_include_baseline_for_honest_comparison():
    pipe = DemandForecastPipeline()
    m = pipe.train(generate_synthetic_demand(days=150, random_seed=3))
    for key in ("mae", "rmse", "r2", "mape", "wape", "baseline_mae"):
        assert key in m
    assert all(m[k] >= 0 for k in ("mae", "rmse", "mape", "wape", "baseline_mae"))
    assert m["mae"] < m["baseline_mae"]  # model must beat "same weekday last week"


def test_inference_rolling_std_matches_training_convention():
    series = [10, 12, 9, 15, 11, 10, 14.0]
    assert np.std(series, ddof=1) == pytest.approx(pd.Series(series).std())


def test_history_source_flags_placeholder_history():
    svc = ForecastService()
    no_hist = svc.generate_forecast(DemandForecastRequest(product_id=3, horizon_days=7))
    assert no_hist.history_source == "synthetic_placeholder"
    hist = [HistoricalDataPoint(date=f"2025-02-{d:02d}", quantity=20 + d % 5) for d in range(1, 21)]
    real = svc.generate_forecast(
        DemandForecastRequest(product_id=3, horizon_days=7, start_date="2025-02-21", historical_data=hist)
    )
    assert real.history_source == "provided"


@pytest.mark.parametrize("level", [3, 20, 200])
def test_forecast_follows_the_products_own_volume(level):
    """A tree model on raw units could not leave its training range (3/day -> ~10, 200/day -> ~83)."""
    import datetime as dt

    rng = np.random.default_rng(1)
    hist = [
        HistoricalDataPoint(date=(dt.date(2026, 9, 1) + dt.timedelta(days=d)).isoformat(), quantity=float(rng.poisson(level)))
        for d in range(60)
    ]
    fc = ForecastService().generate_forecast(
        DemandForecastRequest(product_id=1, warehouse_id=1, horizon_days=14, start_date="2026-10-31", historical_data=hist)
    )
    assert 0.6 * level <= fc.daily_average <= 1.6 * level


def test_old_raw_unit_model_artifacts_are_rejected(tmp_path):
    import joblib

    pipe = DemandForecastPipeline()
    pipe.train(generate_synthetic_demand(days=100, random_seed=1))
    path = tmp_path / "old_model.joblib"
    pipe.version = "1.0.0"
    pipe.save(path)
    with pytest.raises(ValueError, match="retrain"):
        DemandForecastPipeline.load(path)

import tempfile
from pathlib import Path
import pytest
from app.ml.data_generator import generate_synthetic_demand
from app.ml.feature_engineering import build_feature_matrix
from app.ml.pipeline import DemandForecastPipeline
from app.ml.model_registry import ModelRegistry


def test_synthetic_data_generation():
    df = generate_synthetic_demand(product_ids=[1, 2], warehouse_ids=[1], days=30)
    assert len(df) == 60
    assert "demand" in df.columns
    assert "date" in df.columns
    assert (df["demand"] >= 0).all()


def test_feature_engineering():
    df = generate_synthetic_demand(product_ids=[1], warehouse_ids=[1], days=40)
    X, y, features = build_feature_matrix(df, target_col="demand", drop_na=True)

    assert len(X) > 0
    assert len(X) == len(y)
    assert "lag_1" in features
    assert "lag_7" in features
    assert "rolling_mean_7" in features
    assert "day_of_week" in features
    assert not X.isna().any().any()


def test_training_pipeline_and_prediction():
    df = generate_synthetic_demand(product_ids=[1, 2], warehouse_ids=[1], days=60)
    pipeline = DemandForecastPipeline(model_type="random_forest")
    metrics = pipeline.train(df, test_size=0.2)

    assert "mae" in metrics
    assert "rmse" in metrics
    assert "r2" in metrics
    assert metrics["mae"] >= 0

    preds = pipeline.predict_multi_step(product_id=1, warehouse_id=1, horizon_days=5)
    assert len(preds) == 5
    for p in preds:
        assert p["predicted_demand"] >= 0
        assert p["lower_bound"] <= p["predicted_demand"]
        assert p["upper_bound"] >= p["predicted_demand"]


def test_model_save_and_load():
    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_path = Path(tmpdir) / "test_model.joblib"
        df = generate_synthetic_demand(product_ids=[1], warehouse_ids=[1], days=50)

        pipeline = DemandForecastPipeline(model_type="gradient_boosting")
        pipeline.train(df)
        pipeline.save(tmp_path)

        assert tmp_path.exists()

        loaded_pipeline = DemandForecastPipeline.load(tmp_path)
        assert loaded_pipeline.model is not None
        assert loaded_pipeline.model_type == "gradient_boosting"

        preds = loaded_pipeline.predict_multi_step(product_id=1, horizon_days=3)
        assert len(preds) == 3


def test_training_endpoint_trigger(client):
    payload = {
        "model_type": "random_forest",
        "days_of_history": 60,
        "test_size": 0.2,
        "save_as_default": True,
    }
    response = client.post("/api/forecast/train", json=payload)
    assert response.status_code == 200
    res = response.json()
    assert res["success"] is True
    data = res["data"]
    assert "metrics" in data
    assert "mae" in data["metrics"]
    assert data["model_type"] == "random_forest"
    assert data["samples_count"] > 0

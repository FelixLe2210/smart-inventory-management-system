"""Sprint8-08 – lưu / nạp model."""
import pytest
from app.ml.data_generator import generate_synthetic_demand
from app.ml.model_registry import ModelRegistry
from app.ml.model_store import resolve_model_path, metadata_path
from app.ml.pipeline import DemandForecastPipeline


@pytest.fixture()
def df():
    return generate_synthetic_demand(product_ids=[1], warehouse_ids=[1], days=60)


@pytest.fixture()
def reg(tmp_path):
    return ModelRegistry(models_dir=tmp_path)


def test_save_load_roundtrip_gives_identical_predictions(tmp_path, df):
    p = DemandForecastPipeline("random_forest")
    p.train(df)
    path = tmp_path / "m.joblib"
    p.save(path)
    q = DemandForecastPipeline.load(path)
    kw = dict(product_id=1, warehouse_id=1, horizon_days=7)
    assert p.predict_multi_step(**kw) == q.predict_multi_step(**kw)
    assert q.metrics == p.metrics and q.features == p.features


def test_save_writes_sidecar_and_no_tmp_files(tmp_path, df):
    p = DemandForecastPipeline("random_forest"); p.train(df)
    path = tmp_path / "m.joblib"; p.save(path)
    assert metadata_path(path).exists()
    assert not list(tmp_path.glob("*.tmp"))


def test_failed_save_keeps_previous_artifact(tmp_path, df, monkeypatch):
    p = DemandForecastPipeline("random_forest"); p.train(df)
    path = tmp_path / "m.joblib"; p.save(path)
    before = path.read_bytes()
    import app.ml.model_store as ms
    monkeypatch.setattr(ms.joblib, "dump", lambda *a, **k: (_ for _ in ()).throw(OSError("disk full")))
    with pytest.raises(OSError):
        p.save(path)
    assert path.read_bytes() == before
    assert not list(tmp_path.glob("*.tmp"))


def test_load_rejects_corrupt_and_invalid_artifacts(tmp_path):
    bad = tmp_path / "bad.joblib"; bad.write_bytes(b"not a model")
    with pytest.raises(ValueError):
        DemandForecastPipeline.load(bad)
    import joblib
    wrong = tmp_path / "wrong.joblib"; joblib.dump({"model": object(), "features": ["a"]}, wrong)
    with pytest.raises(ValueError):
        DemandForecastPipeline.load(wrong)
    with pytest.raises(FileNotFoundError):
        DemandForecastPipeline.load(tmp_path / "missing.joblib")


@pytest.mark.parametrize("name", ["../evil.joblib", "a/b.joblib", "..\\x.joblib", "m.pkl", "", "/etc/passwd"])
def test_resolve_model_path_blocks_traversal(tmp_path, name):
    with pytest.raises(ValueError):
        resolve_model_path(tmp_path, name)


def test_registry_list_and_load(reg, df):
    reg.train_and_register("random_forest", custom_df=df, save_as_default=True)
    reg.train_and_register("gradient_boosting", custom_df=df, save_as_default=False)
    models = reg.list_models()
    assert len(models) == 2
    assert sum(m["is_active"] for m in models) == 1
    other = next(m["model_name"] for m in models if not m["is_active"])
    reg.load_model(other)
    assert reg.active_model_name == other
    assert reg.get_info().algorithm == "gradient_boosting"


def test_failed_load_keeps_active_model(reg, df, tmp_path):
    reg.train_and_register("random_forest", custom_df=df)
    active = reg.active_model_name
    (tmp_path / "broken.joblib").write_bytes(b"junk")
    with pytest.raises(ValueError):
        reg.load_model("broken.joblib")
    with pytest.raises(FileNotFoundError):
        reg.load_model("nope.joblib")
    assert reg.active_model_name == active and reg.active_pipeline is not None


def test_non_default_saves_do_not_overwrite_each_other(reg, df, monkeypatch):
    import app.ml.model_registry as mr
    class _D:  # hai lần lưu trong cùng giây vẫn phải ra hai file: đổi tên bằng timestamp giả
        calls = iter(["20260101T000001", "20260101T000002"])
        @staticmethod
        def now(tz=None):
            class _N:
                def strftime(self, fmt): return next(_D.calls)
            return _N()
    monkeypatch.setattr(mr, "datetime", _D)
    a = reg.train_and_register("random_forest", custom_df=df, save_as_default=False)
    b = reg.train_and_register("random_forest", custom_df=df, save_as_default=False)
    assert a["model_name"] != b["model_name"]


def test_api_saved_models_and_load(client):
    saved = client.get("/api/forecast/models/saved").json()
    assert saved["success"] is True and any(m["is_active"] for m in saved["data"])
    name = next(m["model_name"] for m in saved["data"] if m["is_active"])
    ok = client.post("/api/forecast/models/load", json={"model_name": name})
    assert ok.status_code == 200 and ok.json()["data"]["is_loaded"] is True
    assert client.post("/api/forecast/models/load", json={"model_name": "missing-model.joblib"}).status_code == 404
    assert client.post("/api/forecast/models/load", json={"model_name": "../../etc/passwd.joblib"}).status_code == 400

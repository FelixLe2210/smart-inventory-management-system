import pytest

from app.config import settings

LOAD = {"model_name": "demand_forecast_model.joblib"}


@pytest.fixture
def cfg(monkeypatch):
    def set_(env, key):
        monkeypatch.setattr(settings, "APP_ENV", env)
        monkeypatch.setattr(settings, "ADMIN_API_KEY", key)
    return set_


def test_dev_without_key_allows(client, cfg):
    cfg("development", None)
    assert client.post("/api/forecast/models/load", json=LOAD).status_code == 200


def test_production_without_key_is_disabled(client, cfg):
    cfg("production", None)
    assert client.post("/api/forecast/models/load", json=LOAD).status_code == 403
    assert client.post("/api/forecast/train", json={}).status_code == 403


def test_key_required_when_configured(client, cfg):
    cfg("production", "s3cret")
    assert client.post("/api/forecast/models/load", json=LOAD).status_code == 403
    assert client.post("/api/forecast/models/load", json=LOAD, headers={"X-Admin-Key": "bad"}).status_code == 403
    assert client.post("/api/forecast/models/load", json=LOAD, headers={"X-Admin-Key": "s3cret"}).status_code == 200


def test_read_endpoints_stay_open_in_production(client, cfg):
    cfg("production", "s3cret")
    assert client.get("/api/forecast/models").status_code == 200
    assert client.get("/health").status_code == 200


def test_cors_has_no_wildcard():
    assert "*" not in settings.ALLOWED_ORIGINS

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.ml.model_registry import registry


@pytest.fixture(scope="session")
def client():
    """Create a FastAPI TestClient session."""
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture(autouse=True, scope="session")
def ensure_model_initialized():
    """Ensure baseline model is trained and active for tests."""
    registry.load_or_initialize()

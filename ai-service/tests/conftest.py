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
def ensure_model_initialized(tmp_path_factory):
    """Dùng thư mục models tạm cho cả phiên test.

    Có test gọi POST /api/forecast/train (lưu làm model mặc định). Nếu trỏ vào thư mục models/ thật thì mỗi lần
    chạy pytest sẽ ghi đè model đang dùng bằng model huấn luyện từ dữ liệu giả lập. Fixture này chạy trước `client`
    nên cả lifespan của ứng dụng cũng dùng thư mục tạm.
    """
    registry.models_dir = tmp_path_factory.mktemp("models")
    registry.load_or_initialize()

"""Sprint8-08 – Lưu / nạp artifact model an toàn.

- Ghi atomic (file tạm + os.replace): train/ghi lỗi giữa chừng không làm hỏng model đang dùng.
- Sidecar JSON (<tên>.json) chứa metadata để liệt kê model mà không phải joblib.load.
- Tên model chỉ được là <tên>.joblib nằm TRONG thư mục models (chặn path traversal).
- joblib dựa trên pickle: chỉ nạp file từ thư mục models do chính hệ thống ghi, không nạp file người dùng upload.
"""
import json
import os
import re
import tempfile
from pathlib import Path
from typing import Any, Dict, Optional

import joblib

MODEL_NAME_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,99}\.joblib$")


def resolve_model_path(models_dir: Path, name: str) -> Path:
    """Trả về đường dẫn tuyệt đối của model; ném ValueError nếu tên không hợp lệ."""
    if not isinstance(name, str) or not MODEL_NAME_RE.fullmatch(name) or ".." in name:
        raise ValueError("Tên model không hợp lệ (chỉ chữ, số, '.', '_', '-' và đuôi .joblib).")
    base = Path(models_dir).resolve()
    path = (base / name).resolve()
    if path.parent != base:
        raise ValueError("Tên model nằm ngoài thư mục models.")
    return path


def metadata_path(model_path: Path) -> Path:
    return model_path.with_suffix(".json")


def _atomic_write(path: Path, writer) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=path.parent, suffix=".tmp")
    os.close(fd)
    try:
        writer(tmp)
        os.replace(tmp, path)
    except BaseException:
        if os.path.exists(tmp):
            os.remove(tmp)
        raise


def atomic_dump(payload: Dict[str, Any], path: Path) -> None:
    _atomic_write(path, lambda tmp: joblib.dump(payload, tmp))


def write_metadata(model_path: Path, meta: Dict[str, Any]) -> None:
    def _w(tmp):
        with open(tmp, "w", encoding="utf-8") as fh:
            json.dump(meta, fh, indent=2, ensure_ascii=False)
    _atomic_write(metadata_path(model_path), _w)


def read_metadata(model_path: Path) -> Optional[Dict[str, Any]]:
    mp = metadata_path(model_path)
    if not mp.exists():
        return None
    try:
        return json.loads(mp.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None


def validate_payload(payload: Any) -> None:
    """Kiểm tra artifact đã nạp trước khi dùng; ném ValueError nếu hỏng/không tương thích."""
    if not isinstance(payload, dict):
        raise ValueError("Artifact model không đúng định dạng.")
    model, features = payload.get("model"), payload.get("features")
    if model is None or not hasattr(model, "predict"):
        raise ValueError("Artifact không chứa model có hàm predict.")
    if not isinstance(features, list) or not features or not all(isinstance(f, str) for f in features):
        raise ValueError("Artifact thiếu danh sách feature hợp lệ.")
    expected = getattr(model, "n_features_in_", None)
    if expected is not None and expected != len(features):
        raise ValueError(f"Model cần {expected} feature nhưng artifact khai báo {len(features)}.")

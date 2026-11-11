"""Hằng số & tiện ích dùng chung cho pipeline chuẩn bị dữ liệu AI #1."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
RAW_DIR = ROOT / "data" / "raw"
PROCESSED_DIR = ROOT / "data" / "processed"
DOCS_AI_DIR = ROOT / "docs" / "ai"
EDA_DIR = DOCS_AI_DIR / "eda"

RAW_FILE = RAW_DIR / "sales_raw.csv"
CLEAN_FILE = PROCESSED_DIR / "sales_clean.csv"
TRAIN_FILE = PROCESSED_DIR / "train.csv"
TEST_FILE = PROCESSED_DIR / "test.csv"
SCHEMA_FILE = PROCESSED_DIR / "data_schema.json"
CLEAN_REPORT_FILE = PROCESSED_DIR / "cleaning_report.json"

# Schema chuẩn: 1 dòng = 1 ngày x 1 sản phẩm (SKU) x 1 kho.
# `sku` và `warehouse_code` trùng với products.sku / warehouses.code trong backend
# để sau này AI service map ngược về Product / Warehouse mà không cần bảng chuyển đổi.
CANONICAL_COLUMNS = ["date", "sku", "warehouse_code", "units_sold", "unit_price", "promotion_flag"]
KEY = ["sku", "warehouse_code"]          # định danh một chuỗi thời gian
TARGET = "units_sold"


def ensure_dirs():
    for d in (RAW_DIR, PROCESSED_DIR, DOCS_AI_DIR, EDA_DIR):
        d.mkdir(parents=True, exist_ok=True)


def data_note() -> str:
    """Ghi chú đúng với nguồn dữ liệu hiện tại (mô phỏng hay dữ liệu ngoài) để báo cáo không nói sai."""
    import json

    try:
        info = json.loads((RAW_DIR / "data_source.json").read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return "Data source is unknown (no data_source.json)."
    if info.get("synthetic"):
        return "Data is synthetic; results validate the evaluation pipeline, not real-world accuracy."
    return (f"Data is external ({info.get('input')}); results are measured on that dataset, "
            "not on this system's own sales history.")

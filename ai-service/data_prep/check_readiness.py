"""Kiểm tra dataset AI #1 đã đủ điều kiện để huấn luyện và đánh giá chưa (chỉ đọc, không sửa dữ liệu).

Chạy sau `python run_data_prep.py`:

    cd ai-service
    python -m data_prep.check_readiness
    python -m data_prep.check_readiness --known-skus skus_trong_db.txt    # kiểm tra khớp sản phẩm trong DB

Mỗi kiểm tra trả về PASS / WARN / FAIL. Có FAIL thì thoát với mã 1.
"""
from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

import pandas as pd

from .common import CANONICAL_COLUMNS, KEY, ROOT, TARGET

PASS, WARN, FAIL = "PASS", "WARN", "FAIL"

MIN_TRAIN_DAYS = 180   # tối thiểu để học được mùa vụ theo tuần/tháng một cách tương đối
MIN_TEST_DAYS = 30
MAX_IMPUTED_SHARE = 0.10
INTERMITTENT_ZERO_SHARE = 0.30


@dataclass(frozen=True)
class Check:
    name: str
    status: str
    detail: str


def _read(path: Path) -> pd.DataFrame:
    return pd.read_csv(path, parse_dates=["date"], dtype={"sku": str, "warehouse_code": str})


def _examples(values, limit: int = 5) -> str:
    values = list(values)
    shown = ", ".join(str(v) for v in values[:limit])
    return shown + (f" ... (+{len(values) - limit})" if len(values) > limit else "")


def run_checks(
    root: Path = ROOT,
    known_skus: Optional[set] = None,
    min_train_days: int = MIN_TRAIN_DAYS,
    min_test_days: int = MIN_TEST_DAYS,
) -> list:
    root = Path(root)
    raw_dir = root / "data" / "raw"
    proc_dir = root / "data" / "processed"
    checks: list = []

    # ---- 1. file cần có
    needed = {
        "sales_raw.csv": raw_dir / "sales_raw.csv",
        "sales_clean.csv": proc_dir / "sales_clean.csv",
        "train.csv": proc_dir / "train.csv",
        "test.csv": proc_dir / "test.csv",
    }
    missing = [n for n, p in needed.items() if not p.exists()]
    if missing:
        checks.append(Check("Có đủ file dữ liệu", FAIL,
                            f"Thiếu: {', '.join(missing)}. Chạy `python run_data_prep.py` trong thư mục ai-service."))
        return checks  # không có dữ liệu thì các kiểm tra sau vô nghĩa
    checks.append(Check("Có đủ file dữ liệu", PASS, "sales_raw, sales_clean, train, test"))

    # ---- 2. nguồn dữ liệu
    source_file = raw_dir / "data_source.json"
    if not source_file.exists():
        checks.append(Check("Nguồn dữ liệu", WARN, "Không có data_source.json nên không biết là dữ liệu thật hay mô phỏng."))
    else:
        info = json.loads(source_file.read_text(encoding="utf-8"))
        if info.get("synthetic"):
            checks.append(Check("Nguồn dữ liệu", WARN,
                                "Dữ liệu MÔ PHỎNG: chỉ chứng minh pipeline chạy, không chứng minh độ chính xác thực tế. "
                                "Báo cáo phải nói rõ điều này."))
        else:
            checks.append(Check("Nguồn dữ liệu", PASS, f"Dữ liệu ngoài: {info.get('input') or info.get('source')}"))

    clean, train, test = _read(needed["sales_clean.csv"]), _read(needed["train.csv"]), _read(needed["test.csv"])

    # ---- 3. schema
    absent = [c for c in CANONICAL_COLUMNS if c not in clean.columns]
    if absent:
        checks.append(Check("Đủ cột chuẩn", FAIL, f"Thiếu cột: {', '.join(absent)}"))
        return checks
    checks.append(Check("Đủ cột chuẩn", PASS, ", ".join(CANONICAL_COLUMNS)))

    # ---- 4. chất lượng dữ liệu
    problems = []
    if clean[["date", "sku"]].isna().any().any():
        problems.append("có ngày/SKU rỗng")
    if (clean[TARGET] < 0).any():
        problems.append("có số lượng bán âm")
    if clean.duplicated(subset=["date"] + KEY).any():
        problems.append("có dòng trùng (ngày, SKU, kho)")
    checks.append(Check("Chất lượng dữ liệu sau làm sạch", FAIL if problems else PASS,
                        "; ".join(problems) if problems else "Không có rỗng, âm, trùng"))

    if "is_imputed" in clean.columns:
        share = float(clean["is_imputed"].mean())
        checks.append(Check("Tỉ lệ ngày bị điền khuyết", WARN if share > MAX_IMPUTED_SHARE else PASS,
                            f"{share:.1%} dòng được điền (ngưỡng {MAX_IMPUTED_SHARE:.0%})"))

    # ---- 5. chia train/test theo thời gian
    if train["date"].max() < test["date"].min():
        checks.append(Check("Chia train/test theo thời gian", PASS,
                            f"train đến {train['date'].max().date()}, test từ {test['date'].min().date()}"))
    else:
        checks.append(Check("Chia train/test theo thời gian", FAIL,
                            "Train và test chồng lấn thời gian: có nguy cơ rò rỉ dữ liệu tương lai."))

    # ---- 6. độ dài lịch sử mỗi chuỗi
    train_days = train.groupby(KEY)["date"].nunique()
    test_days = test.groupby(KEY)["date"].nunique()
    short_train = train_days[train_days < min_train_days]
    checks.append(Check("Số chuỗi thời gian", PASS if len(train_days) else FAIL,
                        f"{len(train_days)} chuỗi (SKU x kho)"))
    checks.append(Check(f"Lịch sử huấn luyện >= {min_train_days} ngày", WARN if len(short_train) else PASS,
                        f"{len(short_train)} chuỗi quá ngắn: {_examples(short_train.index.tolist())}" if len(short_train)
                        else f"Ngắn nhất {int(train_days.min())} ngày"))
    short_test = test_days[test_days < min_test_days]
    checks.append(Check(f"Tập kiểm tra >= {min_test_days} ngày", WARN if len(short_test) else PASS,
                        f"{len(short_test)} chuỗi quá ngắn" if len(short_test) else f"Ngắn nhất {int(test_days.min())} ngày"))

    # ---- 7. loại nhu cầu (gợi ý chọn metric)
    zero_share = clean.assign(_z=clean[TARGET] == 0).groupby(KEY)["_z"].mean()
    intermittent = zero_share[zero_share > INTERMITTENT_ZERO_SHARE]
    checks.append(Check("Chuỗi ngắt quãng (nhiều ngày bán 0)", PASS,
                        f"{len(intermittent)}/{len(zero_share)} chuỗi có >{INTERMITTENT_ZERO_SHARE:.0%} ngày bằng 0; "
                        "với các chuỗi này dùng MAE/WAPE thay vì MAPE"))

    # ---- 8. khớp sản phẩm trong database
    if known_skus is not None:
        data_skus = set(clean["sku"].astype(str).unique())
        unmatched = sorted(data_skus - set(known_skus))
        if not unmatched:
            checks.append(Check("SKU khớp sản phẩm trong DB", PASS, f"Cả {len(data_skus)} SKU đều có trong DB"))
        else:
            checks.append(Check("SKU khớp sản phẩm trong DB", WARN,
                                f"{len(unmatched)}/{len(data_skus)} SKU không có trong DB: {_examples(unmatched)}. "
                                "AI vẫn huấn luyện được, nhưng không map ngược về sản phẩm của hệ thống."))

    # ---- 9. file mô hình
    sidecar = root / "models" / "demand_forecast_model.json"
    if not sidecar.exists():
        checks.append(Check("Mô hình đã huấn luyện", WARN, "Chưa có models/demand_forecast_model.json: khởi động AI service để huấn luyện."))
    else:
        meta = json.loads(sidecar.read_text(encoding="utf-8"))
        version = str(meta.get("version", ""))
        if version.startswith("2."):
            checks.append(Check("Mô hình đã huấn luyện", PASS, f"phiên bản {version}, huấn luyện lúc {meta.get('trained_at')}"))
        else:
            checks.append(Check("Mô hình đã huấn luyện", WARN,
                                f"Phiên bản '{version}' cũ: AI service sẽ từ chối và huấn luyện lại."))
    return checks


def format_report(checks: list) -> str:
    icon = {PASS: "[ OK ]", WARN: "[LƯU Ý]", FAIL: "[LỖI ]"}
    lines = [f"{icon[c.status]} {c.name}: {c.detail}" for c in checks]
    counts = {s: sum(1 for c in checks if c.status == s) for s in (PASS, WARN, FAIL)}
    lines.append(f"\nTổng: {counts[PASS]} đạt, {counts[WARN]} lưu ý, {counts[FAIL]} lỗi")
    return "\n".join(lines)


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--root", type=Path, default=ROOT, help="thư mục gốc repo (mặc định: tự xác định)")
    ap.add_argument("--known-skus", type=Path, help="file văn bản, mỗi dòng một SKU lấy từ bảng products")
    ap.add_argument("--min-train-days", type=int, default=MIN_TRAIN_DAYS)
    args = ap.parse_args(argv)

    known = None
    if args.known_skus:
        known = {line.strip() for line in args.known_skus.read_text(encoding="utf-8").splitlines() if line.strip()}
    checks = run_checks(args.root, known, args.min_train_days)
    print(format_report(checks))
    return 1 if any(c.status == FAIL for c in checks) else 0


if __name__ == "__main__":
    sys.exit(main())

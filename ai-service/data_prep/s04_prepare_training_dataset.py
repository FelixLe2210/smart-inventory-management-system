"""Sprint7-04 – Prepare Training Dataset.

Chia train/test THEO THỜI GIAN (không xáo trộn ngẫu nhiên – xáo trộn sẽ làm lộ tương lai vào tập train
và làm sai lệch MAPE/MAE ở Sprint 8). Mọi chuỗi dùng chung một ngày cắt.

  data/processed/train.csv, test.csv, data_schema.json

Mặc định test = 60 ngày cuối (phủ được horizon 7/14/30 ngày của Sprint 8).
"""
import argparse
import json
import pandas as pd
from .common import (CANONICAL_COLUMNS, CLEAN_FILE, KEY, SCHEMA_FILE, TARGET, TEST_FILE, TRAIN_FILE, ensure_dirs)

MIN_TRAIN_DAYS = 365   # < 1 năm lịch sử thì không học được mùa vụ năm

COLUMN_DOC = {
    "date": ("date", "Ngày bán (YYYY-MM-DD), liên tục không đứt quãng cho mỗi chuỗi"),
    "sku": ("string", "Mã sản phẩm, trùng products.sku của backend"),
    "warehouse_code": ("string", "Mã kho, trùng warehouses.code của backend"),
    "units_sold": ("int >= 0", "Biến mục tiêu: số lượng bán trong ngày"),
    "unit_price": ("float > 0", "Đơn giá thực tế trong ngày (đã trừ khuyến mãi)"),
    "promotion_flag": ("int {0,1}", "1 nếu ngày đó có khuyến mãi"),
    "is_imputed": ("int {0,1}", "1 nếu units_sold được điền bổ sung (ngày thiếu / giá trị lỗi)"),
    "is_outlier_capped": ("int {0,1}", "1 nếu units_sold bị chặn trên do outlier"),
}


def split_by_time(df: pd.DataFrame, test_days: int):
    df = df.copy()
    df["date"] = pd.to_datetime(df["date"])
    cutoff = df["date"].max() - pd.Timedelta(days=test_days)   # ngày cuối cùng của train
    return df[df["date"] <= cutoff], df[df["date"] > cutoff], cutoff


def validate(train: pd.DataFrame, test: pd.DataFrame, full: pd.DataFrame) -> list:
    """Trả về danh sách vấn đề; rỗng nghĩa là hợp lệ."""
    problems = []
    if train.empty or test.empty:
        problems.append("train hoặc test rỗng")
        return problems
    if train["date"].max() >= test["date"].min():
        problems.append("RÒ RỈ: ngày train chồng lấn ngày test")
    if len(train) + len(test) != len(full):
        problems.append("tổng dòng train+test khác dữ liệu gốc")
    for name, part in (("train", train), ("test", test)):
        if part[CANONICAL_COLUMNS].isna().any().any():
            problems.append(f"{name} còn giá trị null")
        if part.duplicated(["date", *KEY]).any():
            problems.append(f"{name} có khóa (ngày, SKU, kho) trùng")
        if (part[TARGET] < 0).any():
            problems.append(f"{name} có units_sold âm")
        span = part.groupby(KEY)["date"].agg(["min", "max", "count"])
        if ((span["max"] - span["min"]).dt.days + 1 != span["count"]).any():
            problems.append(f"{name} có chuỗi bị đứt quãng ngày")
    if set(map(tuple, test[KEY].drop_duplicates().values)) - set(map(tuple, train[KEY].drop_duplicates().values)):
        problems.append("test có chuỗi không xuất hiện trong train (cold-start)")
    return problems


def build_schema(train, test, cutoff, test_days):
    short = train.groupby(KEY)["date"].count()
    short = short[short < MIN_TRAIN_DAYS]
    return {
        "description": "Dataset dự báo nhu cầu AI #1 – 1 dòng = 1 ngày × 1 SKU × 1 kho",
        "target": TARGET,
        "series_key": KEY,
        "columns": [{"name": c, "type": t, "description": d} for c, (t, d) in COLUMN_DOC.items()],
        "split": {
            "method": "time_based", "test_days": test_days,
            "train_range": [str(train["date"].min().date()), str(train["date"].max().date())],
            "test_range": [str(test["date"].min().date()), str(test["date"].max().date())],
            "cutoff_date": str(cutoff.date()),
            "train_rows": int(len(train)), "test_rows": int(len(test)),
        },
        "series_count": int(train.groupby(KEY).ngroups),
        "series_with_short_history": [f"{a} @ {b}" for a, b in short.index],
        "notes": [
            "Chưa có feature lịch/lag: sẽ tạo ở Sprint7-05 trên train rồi áp lên test (không fit trên test).",
            "Đánh giá nên loại hoặc giảm trọng số dòng is_imputed=1.",
        ],
    }


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("--test-days", type=int, default=60)
    args = ap.parse_args(argv)
    ensure_dirs()
    full = pd.read_csv(CLEAN_FILE, parse_dates=["date"])
    train, test, cutoff = split_by_time(full, args.test_days)
    problems = validate(train, test, full)
    if problems:
        raise SystemExit("Dataset không hợp lệ:\n - " + "\n - ".join(problems))
    train.to_csv(TRAIN_FILE, index=False)
    test.to_csv(TEST_FILE, index=False)
    schema = build_schema(train, test, cutoff, args.test_days)
    SCHEMA_FILE.write_text(json.dumps(schema, indent=2, ensure_ascii=False), encoding="utf-8")
    s = schema["split"]
    print(f"train {s['train_rows']:,} dòng {s['train_range']} | test {s['test_rows']:,} dòng {s['test_range']}")
    print(f"-> {TRAIN_FILE}\n-> {TEST_FILE}\n-> {SCHEMA_FILE}")


if __name__ == "__main__":
    main()

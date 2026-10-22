"""Sprint7-01 – Collect & Prepare Sales Dataset.

Hai nguồn dữ liệu, cùng ra một schema chuẩn (`CANONICAL_COLUMNS`) tại data/raw/sales_raw.csv:

  1. --source synthetic (mặc định): sinh dữ liệu bán hàng mô phỏng, CÓ CHỦ ĐÍCH chèn lỗi
     (thiếu, trùng, âm, outlier, sai định dạng ngày) để pipeline làm sạch có cái để xử lý.
     Dùng để dev/test khi chưa có dữ liệu thật. KHÔNG dùng để báo cáo độ chính xác mô hình.
  2. --source csv --input FILE --map date=Date,sku=Item,...: chuẩn hóa dataset ngoài
     (Kaggle "Store Item Demand Forecasting", Rossmann, Favorita, hoặc xuất từ hệ thống thật).

Ví dụ dataset Kaggle store-item-demand (cột: date,store,item,sales):
  python -m data_prep.s01_collect_sales_dataset --source csv --input train.csv \
      --map date=date,sku=item,warehouse_code=store,units_sold=sales
"""
import argparse
import json
import numpy as np
import pandas as pd
from .common import CANONICAL_COLUMNS, RAW_DIR, RAW_FILE, ensure_dirs

START, END = "2024-01-01", "2026-09-30"

# (sku, giá, nhu cầu nền/ngày, độ nhạy mùa vụ năm, độ nhạy khuyến mãi, xu hướng/năm)
PRODUCTS = [
    ("PRD-LAPTOP01", 18_500_000, 3.0, 0.15, 0.50, 0.08),
    ("PRD-MOUSE01", 250_000, 22.0, 0.10, 0.30, 0.02),
    ("PRD-KEYBOARD01", 650_000, 12.0, 0.12, 0.35, 0.03),
    ("PRD-MONITOR01", 4_200_000, 5.0, 0.20, 0.45, 0.06),
    ("PRD-HEADSET01", 900_000, 9.0, 0.30, 0.40, 0.10),
    ("PRD-FAN01", 700_000, 6.0, 0.60, 0.25, 0.00),   # mùa nóng
    ("PRD-LAMP01", 320_000, 2.0, 0.10, 0.20, -0.05),  # bán chậm, intermittent
    ("PRD-CABLE01", 90_000, 35.0, 0.05, 0.15, 0.01),
]
WAREHOUSES = [("KHO-HCM01", 1.0), ("KHO-HN01", 0.7), ("KHO-DN01", 0.35)]

# Tết Nguyên đán (mùng 1) – nhu cầu giảm mạnh quanh Tết; các ngày lễ cố định thì tăng nhẹ.
TET = {2024: "2024-02-10", 2025: "2025-01-29", 2026: "2026-02-17"}
FIXED_HOLIDAYS = [(1, 1), (4, 30), (5, 1), (9, 2), (11, 11), (12, 12)]  # 11/11, 12/12: sale online


def holiday_multiplier(dates: pd.DatetimeIndex) -> np.ndarray:
    mult = np.ones(len(dates))
    md = list(zip(dates.month, dates.day))
    for i, pair in enumerate(md):
        if pair in FIXED_HOLIDAYS:
            mult[i] *= 1.25
    for year, tet in TET.items():
        t = pd.Timestamp(tet)
        delta = (dates - t).days
        mult *= np.where((delta >= -3) & (delta <= 5), 0.35, 1.0)      # nghỉ Tết
        mult *= np.where((delta >= -21) & (delta < -3), 1.30, 1.0)     # mua sắm trước Tết
    return mult


def generate_clean_truth(seed: int = 42) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    dates = pd.date_range(START, END, freq="D")
    t = np.arange(len(dates)) / 365.25
    doy = dates.dayofyear.values
    dow = dates.dayofweek.values
    dow_factor = np.array([0.90, 0.92, 0.95, 1.00, 1.10, 1.25, 1.18])[dow]  # cuối tuần bán nhiều
    hol = holiday_multiplier(dates)
    frames = []
    for sku, price, base, seas, promo_sens, trend in PRODUCTS:
        # Mùa vụ năm (đỉnh quanh tháng 6 cho quạt, các SKU khác lệch nhẹ)
        phase = 2 * np.pi * (doy - 170) / 365.25 if sku == "PRD-FAN01" else 2 * np.pi * (doy - 330) / 365.25
        for wh, wh_scale in WAREHOUSES:
            # Khuyến mãi: các đợt 5–9 ngày, ~6 đợt/năm
            promo = np.zeros(len(dates), dtype=int)
            for start in rng.choice(len(dates) - 10, size=int(len(dates) / 365.25 * 6), replace=False):
                promo[start:start + rng.integers(5, 10)] = 1
            discount = np.where(promo == 1, rng.uniform(0.08, 0.20, len(dates)), 0.0)
            lam = (base * wh_scale * (1 + trend * t) * (1 + seas * np.cos(phase))
                   * dow_factor * hol * (1 + promo_sens * promo))
            units = rng.poisson(np.maximum(lam, 0.05))
            frames.append(pd.DataFrame({
                "date": dates, "sku": sku, "warehouse_code": wh, "units_sold": units,
                "unit_price": np.round(price * (1 - discount), -2), "promotion_flag": promo,
            }))
    return pd.concat(frames, ignore_index=True)


def inject_dirt(df: pd.DataFrame, seed: int = 7) -> pd.DataFrame:
    """Chèn các loại lỗi dữ liệu thực tế để kiểm thử bước làm sạch."""
    rng = np.random.default_rng(seed)
    df = df.reset_index(drop=True)   # idx dưới đây là vị trí; cần RangeIndex
    n = len(df)
    pick = lambda frac: rng.choice(n, size=int(n * frac), replace=False)

    df["date"] = df["date"].dt.strftime("%Y-%m-%d")
    # 1) Định dạng ngày lẫn lộn (dd/mm/yyyy) – chỉ lấy ngày > 12 để không mơ hồ khi parse
    idx = pick(0.01)
    d = pd.to_datetime(df.loc[idx, "date"])
    ok = d.dt.day > 12
    df.loc[idx[ok.values], "date"] = d[ok].dt.strftime("%d/%m/%Y").values
    # 2) SKU / kho viết hoa-thường, thừa khoảng trắng
    idx = pick(0.01); df.loc[idx, "sku"] = df.loc[idx, "sku"].str.lower() + " "
    idx = pick(0.005); df.loc[idx, "warehouse_code"] = " " + df.loc[idx, "warehouse_code"].str.lower()
    # 3) Thiếu giá trị
    df.loc[pick(0.01), "units_sold"] = np.nan
    df.loc[pick(0.01), "unit_price"] = np.nan
    df.loc[pick(0.002), "sku"] = np.nan
    df.loc[pick(0.003), "promotion_flag"] = np.nan
    # 4) Số lượng âm (hàng trả lại ghi nhầm vào bán hàng)
    idx = pick(0.002); df.loc[idx, "units_sold"] = -df.loc[idx, "units_sold"].abs() - 1
    # 5) Outlier cực đoan (nhập thừa số 0, lỗi nhập liệu)
    idx = pick(0.002); df.loc[idx, "units_sold"] = df.loc[idx, "units_sold"] * 25 + 200
    # 6) Thiếu ngày (kho đóng cửa / mất log)
    df = df.drop(index=pick(0.015))
    # 7) Dòng trùng hoàn toàn + trùng khóa nhưng khác số liệu
    df = pd.concat([df, df.sample(frac=0.01, random_state=1)], ignore_index=True)
    conflict = df.sample(frac=0.003, random_state=2).copy()
    conflict["units_sold"] = conflict["units_sold"] + 1
    df = pd.concat([df, conflict], ignore_index=True)
    return df.sample(frac=1.0, random_state=3).reset_index(drop=True)


def normalize_external(path: str, mapping: dict) -> pd.DataFrame:
    """Đổi tên cột của dataset ngoài về schema chuẩn; cột thiếu được điền mặc định."""
    src = pd.read_csv(path)
    missing = [v for v in mapping.values() if v not in src.columns]
    if missing:
        raise SystemExit(f"Cột không có trong file: {missing}. Cột hiện có: {list(src.columns)}")
    df = src.rename(columns={v: k for k, v in mapping.items()})
    if "warehouse_code" not in df:
        df["warehouse_code"] = "KHO-DEFAULT"
    if "unit_price" not in df:
        df["unit_price"] = np.nan
    if "promotion_flag" not in df:
        df["promotion_flag"] = np.nan
    df["sku"] = df["sku"].astype(str)
    df["warehouse_code"] = df["warehouse_code"].astype(str)
    return df[CANONICAL_COLUMNS]


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--source", choices=["synthetic", "csv"], default="synthetic")
    ap.add_argument("--input", help="đường dẫn CSV (khi --source csv)")
    ap.add_argument("--map", help="ánh xạ cột chuẩn=cột nguồn, ví dụ date=Date,sku=Item,units_sold=Qty")
    ap.add_argument("--seed", type=int, default=42)
    ap.add_argument("--clean-synthetic", action="store_true", help="không chèn lỗi (chỉ để so sánh)")
    args = ap.parse_args(argv)

    ensure_dirs()
    if args.source == "synthetic":
        truth = generate_clean_truth(args.seed)
        df = truth if args.clean_synthetic else inject_dirt(truth, args.seed + 1)
        print("[!] Dữ liệu MÔ PHỎNG – chỉ dùng để dev/test pipeline, không dùng đánh giá mô hình.")
    else:
        if not (args.input and args.map):
            raise SystemExit("--source csv cần --input và --map")
        mapping = dict(p.split("=", 1) for p in args.map.split(","))
        for required in ("date", "sku", "units_sold"):
            if required not in mapping:
                raise SystemExit(f"--map thiếu cột bắt buộc: {required}")
        df = normalize_external(args.input, mapping)

    df[CANONICAL_COLUMNS].to_csv(RAW_FILE, index=False)
    # Ghi nguồn gốc dữ liệu để báo cáo EDA/mô hình luôn nói rõ dữ liệu thật hay mô phỏng.
    (RAW_DIR / "data_source.json").write_text(json.dumps({
        "source": args.source, "synthetic": args.source == "synthetic",
        "input": args.input, "rows": int(len(df)),
    }, indent=2), encoding="utf-8")
    print(f"Đã ghi {len(df):,} dòng -> {RAW_FILE}")


if __name__ == "__main__":
    main()

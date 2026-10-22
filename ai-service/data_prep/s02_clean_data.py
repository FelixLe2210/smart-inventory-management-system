"""Sprint7-02 – Data Cleaning.

Đọc data/raw/sales_raw.csv -> data/processed/sales_clean.csv + cleaning_report.json.

Thứ tự xử lý (mỗi bước ghi số dòng bị ảnh hưởng vào báo cáo để kiểm toán được):
  1. Chuẩn hóa văn bản: SKU / mã kho -> strip + UPPER.
  2. Parse ngày (ISO yyyy-mm-dd trước, rồi dd/mm/yyyy); không parse được -> loại.
  3. Loại dòng thiếu khóa (date / sku / warehouse_code).
  4. Ép kiểu số; số lượng âm là dữ liệu sai (hàng trả, không phải nhu cầu) -> coi như thiếu.
  5. Loại dòng trùng hoàn toàn; trùng khóa (ngày, SKU, kho) nhưng khác số liệu -> giữ dòng cuối.
  6. Lấp đầy lịch ngày liên tục, dùng chung một khoảng ngày cho mọi chuỗi (ngày thiếu -> dòng mới, is_imputed=1).
  7. Outlier: chặn trên theo Q3 + 3*IQR trong cùng (chuỗi, thứ trong tuần); CAP chứ không xóa,
     đánh dấu is_outlier_capped=1.
  8. Điền units_sold thiếu bằng trung vị cục bộ cùng thứ trong tuần (±4 tuần), không dùng toàn chuỗi.
  9. promotion_flag thiếu: suy ra từ giá (giá < 92% trung vị giá của chuỗi => 1), nếu không có giá => 0.
 10. unit_price thiếu: ffill/bfill theo chuỗi, còn lại dùng trung vị chuỗi.

Lưu ý: bước 8 dùng dữ liệu lân cận (kể cả phía sau ngày thiếu) chỉ để lấp lỗ trong lịch sử, không
dùng cho dự báo tương lai. Ngày thiếu có thể là hết hàng thật (nhu cầu bị che); cột is_imputed cho
phép bước train loại/giảm trọng số các dòng này nếu cần.
"""
import json
import numpy as np
import pandas as pd
from .common import (CLEAN_FILE, CLEAN_REPORT_FILE, KEY, RAW_FILE, TARGET, ensure_dirs)

PROMO_PRICE_RATIO = 0.92
IQR_MULT = 3.0


def parse_dates(s: pd.Series) -> pd.Series:
    s = s.astype("string").str.strip()
    iso = pd.to_datetime(s, format="%Y-%m-%d", errors="coerce")
    alt = pd.to_datetime(s, format="%d/%m/%Y", errors="coerce")
    return iso.fillna(alt)


def clean(raw: pd.DataFrame):
    rep = {"rows_raw": int(len(raw))}
    df = raw.copy()

    # 1. Chuẩn hóa văn bản
    for c in ("sku", "warehouse_code"):
        df[c] = df[c].astype("string").str.strip().str.upper().replace("", pd.NA)

    # 2. Ngày
    df["date"] = parse_dates(df["date"])
    rep["dropped_bad_date"] = int(df["date"].isna().sum())

    # 3. Thiếu khóa
    bad_key = df[["date", "sku", "warehouse_code"]].isna().any(axis=1)
    rep["dropped_missing_key"] = int(bad_key.sum())
    df = df[~bad_key].copy()

    # 4. Ép kiểu số, số lượng âm -> thiếu
    for c in ("units_sold", "unit_price", "promotion_flag"):
        df[c] = pd.to_numeric(df[c], errors="coerce")
    neg = df["units_sold"] < 0
    rep["negative_units_set_missing"] = int(neg.sum())
    df.loc[neg, "units_sold"] = np.nan
    df.loc[df["unit_price"] <= 0, "unit_price"] = np.nan

    # 5. Trùng lặp
    n0 = len(df)
    df = df.drop_duplicates()
    rep["exact_duplicates_dropped"] = int(n0 - len(df))
    n0 = len(df)
    df = df.drop_duplicates(subset=["date", *KEY], keep="last")
    rep["key_conflicts_dropped"] = int(n0 - len(df))

    # 6. Lịch ngày liên tục (chung toàn bộ chuỗi)
    df = df.sort_values([*KEY, "date"])
    parts = []
    full = pd.date_range(df["date"].min(), df["date"].max(), freq="D")   # lịch chung cho mọi chuỗi
    for (sku, wh), g in df.groupby(KEY, sort=True):
        g = g.set_index("date").reindex(full)
        g.index.name = "date"
        g["is_imputed"] = g["sku"].isna().astype(int)   # dòng mới thêm có sku NaN
        g["sku"], g["warehouse_code"] = sku, wh
        parts.append(g.reset_index())
    df = pd.concat(parts, ignore_index=True)
    rep["calendar_gap_rows_added"] = int(df["is_imputed"].sum())
    df["dow"] = df["date"].dt.dayofweek
    grp = df.groupby([*KEY, "dow"])[TARGET]

    # 7. Outlier -> cap
    q1, q3 = grp.transform(lambda x: x.quantile(0.25)), grp.transform(lambda x: x.quantile(0.75))
    upper = q3 + IQR_MULT * np.maximum(q3 - q1, 1.0)
    out = df[TARGET] > upper
    rep["outliers_capped"] = int(out.sum())
    df["is_outlier_capped"] = out.astype(int)
    df.loc[out, TARGET] = np.floor(upper[out])

    # 8. Điền units_sold thiếu bằng trung vị cục bộ cùng thứ (±4 tuần)
    miss = df[TARGET].isna()
    rep["units_missing_imputed"] = int(miss.sum())
    local = df.groupby([*KEY, "dow"])[TARGET].transform(lambda x: x.rolling(9, center=True, min_periods=2).median())
    fallback = df.groupby([*KEY, "dow"])[TARGET].transform("median")
    df.loc[miss, TARGET] = local[miss].fillna(fallback[miss]).fillna(0)
    df.loc[miss, "is_imputed"] = 1
    df[TARGET] = df[TARGET].round().astype(int)

    # 10 (làm trước 9 vì 9 cần giá). Giá
    df["unit_price"] = df.groupby(KEY)["unit_price"].transform(lambda x: x.ffill().bfill())
    df["unit_price"] = df["unit_price"].fillna(df.groupby(KEY)["unit_price"].transform("median"))
    rep["price_still_missing"] = int(df["unit_price"].isna().sum())

    # 9. promotion_flag
    med_price = df.groupby(KEY)["unit_price"].transform("median")
    inferred = (df["unit_price"] < PROMO_PRICE_RATIO * med_price).astype(float)
    rep["promotion_flag_inferred"] = int(df["promotion_flag"].isna().sum())
    df["promotion_flag"] = df["promotion_flag"].fillna(inferred).clip(0, 1).astype(int)

    df = df.drop(columns="dow")
    cols = ["date", "sku", "warehouse_code", TARGET, "unit_price", "promotion_flag", "is_imputed", "is_outlier_capped"]
    df = df[cols].sort_values([*KEY, "date"]).reset_index(drop=True)
    rep.update({
        "rows_clean": int(len(df)),
        "series_count": int(df.groupby(KEY).ngroups),
        "date_min": str(df["date"].min().date()),
        "date_max": str(df["date"].max().date()),
        "remaining_nulls": {c: int(v) for c, v in df.isna().sum().items() if v},
    })
    return df, rep


def main():
    ensure_dirs()
    raw = pd.read_csv(RAW_FILE, dtype=str)
    df, rep = clean(raw)
    df.to_csv(CLEAN_FILE, index=False)
    CLEAN_REPORT_FILE.write_text(json.dumps(rep, indent=2, ensure_ascii=False), encoding="utf-8")
    print(json.dumps(rep, indent=2, ensure_ascii=False))
    print(f"-> {CLEAN_FILE}")


if __name__ == "__main__":
    main()

"""Sprint7-03 – EDA for Demand Data.

Đọc data/processed/sales_clean.csv, sinh biểu đồ (docs/ai/eda/*.png) và báo cáo
docs/ai/EDA_REPORT.md. Mọi con số trong báo cáo được TÍNH từ dữ liệu, không gõ tay.
"""
import json
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from .common import CLEAN_FILE, DOCS_AI_DIR, EDA_DIR, KEY, RAW_DIR, TARGET, ensure_dirs

ADI_CUTOFF, CV2_CUTOFF = 1.32, 0.49   # ngưỡng Syntetos–Boylan
TET = {"2024": "2024-02-10", "2025": "2025-01-29", "2026": "2026-02-17"}
DOW = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"]


def classify_demand(units: pd.Series) -> dict:
    """ADI = khoảng cách TB giữa 2 ngày có bán; CV² = (độ lệch chuẩn/TB)² của các ngày có bán."""
    nz = units[units > 0]
    if len(nz) < 2:
        return {"adi": float("inf"), "cv2": float("nan"), "class": "intermittent"}
    adi = len(units) / len(nz)
    cv2 = (nz.std(ddof=0) / nz.mean()) ** 2
    if adi < ADI_CUTOFF:
        cls = "smooth" if cv2 < CV2_CUTOFF else "erratic"
    else:
        cls = "intermittent" if cv2 < CV2_CUTOFF else "lumpy"
    return {"adi": round(float(adi), 3), "cv2": round(float(cv2), 3), "class": cls}


def analyze(df: pd.DataFrame) -> dict:
    df = df.copy()
    df["date"] = pd.to_datetime(df["date"])
    df["series"] = df["sku"] + " @ " + df["warehouse_code"]
    # Chuẩn hóa theo trung bình từng chuỗi để cộng gộp các SKU có quy mô khác nhau
    df["norm"] = df[TARGET] / df.groupby("series")[TARGET].transform("mean").replace(0, np.nan)
    r = {}

    daily = df.groupby("date")[TARGET].sum()
    r["daily"] = daily
    r["total_units"] = int(daily.sum())
    r["n_days"] = int(daily.shape[0])

    r["dow_index"] = df.groupby(df["date"].dt.dayofweek)["norm"].mean()
    r["month_index"] = df.groupby(df["date"].dt.month)["norm"].mean()

    # Xu hướng: so sánh 12 tháng cuối với 12 tháng liền trước
    end = df["date"].max()
    last12 = df[df["date"] > end - pd.DateOffset(years=1)].groupby("sku")[TARGET].sum()
    prev12 = df[(df["date"] <= end - pd.DateOffset(years=1)) & (df["date"] > end - pd.DateOffset(years=2))].groupby("sku")[TARGET].sum()
    r["yoy"] = ((last12 / prev12 - 1) * 100).dropna().round(1)

    # Khuyến mãi: tỉ lệ TB(norm khi KM)/TB(norm khi không KM) theo SKU
    g = df.groupby(["sku", "promotion_flag"])["norm"].mean().unstack()
    r["promo_uplift"] = ((g[1] / g[0] - 1) * 100).dropna().round(1) if 1 in g.columns else pd.Series(dtype=float)

    # Tết: cửa sổ [-3, +5] ngày quanh mùng 1 và 3 tuần trước đó
    def window_mean(lo, hi):
        vals = []
        for t in TET.values():
            t = pd.Timestamp(t)
            m = (df["date"] >= t + pd.Timedelta(days=lo)) & (df["date"] <= t + pd.Timedelta(days=hi))
            vals.append(df.loc[m, "norm"])
        return float(pd.concat(vals).mean()) if vals else float("nan")
    r["tet_break"] = window_mean(-3, 5)
    r["tet_pre"] = window_mean(-21, -4)

    # Tự tương quan của tổng nhu cầu ngày sau khi bỏ xu hướng (chênh lệch với MA 28 ngày)
    detr = (daily - daily.rolling(28, center=True, min_periods=14).mean()).dropna()
    r["acf"] = {lag: round(float(detr.autocorr(lag)), 3) for lag in (1, 7, 14, 28)}

    rows = []
    for series, g2 in df.groupby("series"):
        c = classify_demand(g2[TARGET])
        rows.append({"series": series, "mean_per_day": round(g2[TARGET].mean(), 2),
                     "zero_days_pct": round((g2[TARGET] == 0).mean() * 100, 1), **c})
    r["series_table"] = pd.DataFrame(rows).sort_values("mean_per_day", ascending=False)
    r["imputed_pct"] = round(df["is_imputed"].mean() * 100, 2) if "is_imputed" in df else 0.0
    return r


def plots(r: dict):
    EDA_DIR.mkdir(parents=True, exist_ok=True)
    d = r["daily"]
    fig, ax = plt.subplots(figsize=(11, 4))
    ax.plot(d.index, d.values, lw=0.5, alpha=0.5, label="Hằng ngày")
    ax.plot(d.index, d.rolling(7, min_periods=1).mean(), lw=1.2, label="TB 7 ngày")
    ax.plot(d.index, d.rolling(30, min_periods=1).mean(), lw=2, label="TB 30 ngày")
    ax.set_title("Tổng nhu cầu theo ngày (toàn hệ thống)"); ax.set_ylabel("Số lượng bán"); ax.legend()
    fig.tight_layout(); fig.savefig(EDA_DIR / "01_daily_trend.png", dpi=110); plt.close(fig)

    fig, axes = plt.subplots(1, 2, figsize=(11, 3.8))
    axes[0].bar(DOW, r["dow_index"].values, color="#2563eb"); axes[0].axhline(1, color="gray", lw=0.8)
    axes[0].set_title("Chỉ số theo thứ trong tuần (1.0 = trung bình)")
    axes[1].bar(r["month_index"].index, r["month_index"].values, color="#10b981"); axes[1].axhline(1, color="gray", lw=0.8)
    axes[1].set_title("Chỉ số theo tháng (1.0 = trung bình)"); axes[1].set_xticks(range(1, 13))
    fig.tight_layout(); fig.savefig(EDA_DIR / "02_seasonality.png", dpi=110); plt.close(fig)

    if len(r["promo_uplift"]):
        fig, ax = plt.subplots(figsize=(8, 3.8))
        r["promo_uplift"].sort_values().plot.barh(ax=ax, color="#f59e0b")
        ax.set_title("Mức tăng nhu cầu khi khuyến mãi (%)"); ax.set_xlabel("%")
        fig.tight_layout(); fig.savefig(EDA_DIR / "03_promo_uplift.png", dpi=110); plt.close(fig)

    st = r["series_table"]
    colors = {"smooth": "#10b981", "erratic": "#f59e0b", "intermittent": "#3b82f6", "lumpy": "#ef4444"}
    fig, ax = plt.subplots(figsize=(7, 5))
    for cls, g in st.groupby("class"):
        ax.scatter(g["adi"], g["cv2"], label=cls, c=colors[cls], s=40)
    ax.axvline(ADI_CUTOFF, color="gray", ls="--", lw=0.8); ax.axhline(CV2_CUTOFF, color="gray", ls="--", lw=0.8)
    ax.set_xlabel("ADI"); ax.set_ylabel("CV²"); ax.set_title("Phân loại tính chất nhu cầu (ADI–CV²)"); ax.legend()
    fig.tight_layout(); fig.savefig(EDA_DIR / "04_demand_classes.png", dpi=110); plt.close(fig)


def write_report(r: dict, source: dict):
    dow, mon = r["dow_index"], r["month_index"]
    best_d, worst_d = int(dow.idxmax()), int(dow.idxmin())
    best_m, worst_m = int(mon.idxmax()), int(mon.idxmin())
    classes = r["series_table"]["class"].value_counts().to_dict()
    acf = r["acf"]
    lines = ["# Báo cáo EDA – Dữ liệu nhu cầu (Sprint7-03)", ""]
    if source.get("synthetic"):
        lines += ["> ⚠ **Dữ liệu MÔ PHỎNG** (sinh bởi `s01_collect_sales_dataset.py`). Các quy luật bên dưới",
                  "> phản ánh giả định khi sinh dữ liệu, **không** phải hành vi khách hàng thật. Chạy lại pipeline",
                  "> với dữ liệu thật rồi tái tạo báo cáo này trước khi rút kết luận cho mô hình.", ""]
    lines += [
        f"- Số ngày: **{r['n_days']}**, tổng lượng bán: **{r['total_units']:,}**, số chuỗi (SKU × kho): **{len(r['series_table'])}**",
        f"- Tỉ lệ dòng được điền bổ sung (`is_imputed`): **{r['imputed_pct']}%**", "",
        "## 1. Xu hướng", "![](eda/01_daily_trend.png)", "",
        "Tăng trưởng 12 tháng gần nhất so với 12 tháng trước, theo SKU:", "",
        "| SKU | Thay đổi |", "|---|---:|", *[f"| {k} | {v:+.1f}% |" for k, v in r["yoy"].items()], "",
        "## 2. Tính mùa vụ", "![](eda/02_seasonality.png)", "",
        f"- **Thứ trong tuần:** cao nhất {DOW[best_d]} (×{dow[best_d]:.2f}), thấp nhất {DOW[worst_d]} (×{dow[worst_d]:.2f}).",
        f"- **Tháng:** cao nhất tháng {best_m} (×{mon[best_m]:.2f}), thấp nhất tháng {worst_m} (×{mon[worst_m]:.2f}).",
        f"- **Tự tương quan** (sau khi bỏ xu hướng): lag 1 = {acf[1]}, lag 7 = {acf[7]}, lag 14 = {acf[14]}, lag 28 = {acf[28]}.",
        "  Lag 7 cao ⇒ chu kỳ tuần rõ, nên có feature `day_of_week` và lag 7/14/28.", "",
        "## 3. Ảnh hưởng của sự kiện", "",
        f"- **Nghỉ Tết** (−3…+5 ngày quanh mùng 1): nhu cầu chuẩn hóa ≈ **{r['tet_break']:.2f}** (1.0 = trung bình).",
        f"- **Trước Tết** (−21…−4 ngày): ≈ **{r['tet_pre']:.2f}**.",
        "- Lịch Tết/ngày lễ phải đưa vào feature (Sprint7-05); lịch dương thông thường không bắt được hiệu ứng này.", "",
    ]
    if len(r["promo_uplift"]):
        lines += ["### Khuyến mãi", "![](eda/03_promo_uplift.png)", "",
                  f"Mức tăng trung bình khi khuyến mãi: **{r['promo_uplift'].mean():+.1f}%** "
                  f"(từ {r['promo_uplift'].min():+.1f}% đến {r['promo_uplift'].max():+.1f}%). "
                  "`promotion_flag` là feature ngoại sinh đáng giữ.", ""]
    lines += ["## 4. Tính chất nhu cầu (ADI–CV²)", "![](eda/04_demand_classes.png)", "",
              "Phân bố: " + ", ".join(f"{k} = {v}" for k, v in classes.items()) + ".", "",
              "| Chuỗi | TB/ngày | % ngày không bán | ADI | CV² | Loại |", "|---|---:|---:|---:|---:|---|",
              *[f"| {x.series} | {x.mean_per_day} | {x.zero_days_pct} | {x.adi} | {x.cv2} | {x['class']} |"
                for _, x in r["series_table"].iterrows()], "",
              "**Hàm ý cho mô hình:** chuỗi smooth/erratic hợp Random Forest/XGBoost/Prophet; chuỗi intermittent/lumpy "
              "(nhiều ngày = 0) nên đánh giá bằng MAE/WAPE thay vì MAPE (MAPE chia cho 0 hoặc bị phóng đại), "
              "và cân nhắc dự báo theo tuần.", ""]
    (DOCS_AI_DIR / "EDA_REPORT.md").write_text("\n".join(lines), encoding="utf-8")


def main():
    ensure_dirs()
    df = pd.read_csv(CLEAN_FILE)
    src_file = RAW_DIR / "data_source.json"
    source = json.loads(src_file.read_text()) if src_file.exists() else {}
    r = analyze(df)
    plots(r)
    write_report(r, source)
    print(f"-> {DOCS_AI_DIR / 'EDA_REPORT.md'}")


if __name__ == "__main__":
    main()

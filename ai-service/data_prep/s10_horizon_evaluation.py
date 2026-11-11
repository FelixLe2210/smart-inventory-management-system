"""Sai số dự báo theo độ dài dự báo (1, 7, 14, 30 ngày) trên tập test theo thời gian.

Sản phẩm dự báo 7 đến 30 ngày phía trước, nên đo sai số ở mức một ngày (s08) là chưa đủ: dự báo nhiều
ngày phải dùng chính dự đoán của mình làm đặc trưng lag cho ngày kế tiếp, và sai số cộng dồn. Script này mô phỏng
đúng cách đó (dự báo đệ quy) từ nhiều điểm xuất phát trong tập test rồi chấm theo từng độ dài.

Với mỗi điểm xuất phát (ngày cuối cùng đã biết nhu cầu) và mỗi chuỗi, mô hình dự báo ngày kế tiếp, đưa kết quả
vào lịch sử, rồi dự báo ngày sau nữa, cho tới 30 ngày. Nhu cầu thực của các ngày sau điểm xuất phát không bao giờ
được dùng làm đặc trưng.

Ba loại chỉ số cho mỗi độ dài h:
  * cửa sổ h  - sai số trên các ngày 1..h sau điểm xuất phát (MAE, RMSE, WAPE);
  * ngày thứ h - sai số riêng của ngày thứ h (cho thấy sai số tăng theo độ xa);
  * tổng cầu h - lệch giữa tổng cầu dự báo và tổng cầu thực trong h ngày. Đây là con số đề xuất đặt hàng cần,
    vì điểm đặt hàng dựa trên tổng cầu trong thời gian giao hàng chứ không phải từng ngày.
"""
import argparse
import json
import math
from pathlib import Path

import numpy as np
import pandas as pd

from .common import DOCS_AI_DIR, KEY, PROCESSED_DIR, TARGET, TEST_FILE, TRAIN_FILE, data_note, ensure_dirs
from .s05_calendar_features import add_calendar_features
from .s08_model_evaluation import (
    CALENDAR_FEATURES,
    CATEGORY_COLUMNS,
    LAG_FEATURES,
    _estimator_pipeline,
    _make_features,
    _validate_inputs,
)
from sklearn.ensemble import GradientBoostingRegressor, RandomForestRegressor

HORIZONS = (1, 7, 14, 30)
ENGINEERED = [*CALENDAR_FEATURES, *LAG_FEATURES]
BASELINES = ("seasonal_naive_7d", "weekday_mean")
LAGS = (1, 7, 14, 28)
WINDOWS = (7, 28)


def build_history(train: pd.DataFrame, test: pd.DataFrame):
    """Ma trận nhu cầu (chuỗi x ngày) liên tục từ ngày đầu train đến ngày cuối test."""
    combined = pd.concat([train, test], ignore_index=True)
    combined["date"] = pd.to_datetime(combined["date"])
    dates = pd.date_range(combined["date"].min(), combined["date"].max(), freq="D")
    table = combined.pivot_table(index=KEY, columns="date", values=TARGET, aggfunc="sum")
    table = table.reindex(columns=dates)
    if table.isna().any().any():
        raise ValueError("Dữ liệu thiếu ngày ở ít nhất một chuỗi; cần chuỗi liên tục để dự báo đệ quy.")
    keys = pd.DataFrame(list(table.index), columns=KEY)
    return keys, dates, table.to_numpy(dtype=float)


def _calendar_table(dates: pd.DatetimeIndex) -> pd.DataFrame:
    return add_calendar_features(pd.DataFrame({"date": dates})).reset_index(drop=True)


def recursive_forecast(model, history, keys, calendar, origin, steps, feature_columns=ENGINEERED):
    """Dự báo `steps` ngày sau cột `origin` của `history` cho mọi chuỗi cùng lúc.

    Trả về mảng (số chuỗi, steps). Chỉ cột <= origin của `history` và các dự đoán trước đó được dùng.
    """
    work = history.copy()
    work[:, origin + 1:] = np.nan  # xóa tương lai để chắc chắn không bị dùng nhầm
    predictions = np.zeros((history.shape[0], steps))
    for k in range(1, steps + 1):
        pos = origin + k
        frame = keys.copy()
        for column in CALENDAR_FEATURES:
            frame[column] = calendar.at[pos, column]
        for lag in LAGS:
            frame[f"lag_{lag}"] = work[:, pos - lag]
        for window in WINDOWS:
            recent = work[:, pos - window:pos]
            frame[f"rolling_mean_{window}"] = recent.mean(axis=1)
            frame[f"rolling_std_{window}"] = recent.std(axis=1, ddof=1)
        values = np.maximum(0.0, np.asarray(model.predict(frame[[*CATEGORY_COLUMNS, *feature_columns]]), dtype=float))
        work[:, pos] = values
        predictions[:, k - 1] = values
    return predictions


def baseline_forecasts(history, keys, train_weekday_means, dates, origin, steps):
    """Hai baseline không cần mô hình: lặp lại cùng thứ của tuần đã biết gần nhất; trung bình theo thứ."""
    naive = np.zeros((history.shape[0], steps))
    weekday = np.zeros((history.shape[0], steps))
    for k in range(1, steps + 1):
        naive[:, k - 1] = history[:, origin + k - 7 * math.ceil(k / 7)]
        weekday[:, k - 1] = train_weekday_means[:, dates[origin + k].dayofweek]
    return {"seasonal_naive_7d": naive, "weekday_mean": weekday}


def _error_metrics(actual: np.ndarray, predicted: np.ndarray) -> dict:
    errors = np.abs(actual - predicted)
    denominator = float(np.abs(actual).sum())
    return {
        "rows": int(actual.size),
        "mae": round(float(errors.mean()), 4),
        "rmse": round(float(np.sqrt(np.mean(errors**2))), 4),
        "wape": round(float(errors.sum() / denominator), 6) if denominator else None,
    }


def horizon_metrics(actual: np.ndarray, predicted: np.ndarray, horizon: int) -> dict:
    """actual, predicted: (số điểm xuất phát, số chuỗi, số ngày dự báo)."""
    window_a, window_p = actual[:, :, :horizon], predicted[:, :, :horizon]
    lead_a, lead_p = actual[:, :, horizon - 1], predicted[:, :, horizon - 1]
    total_a, total_p = window_a.sum(axis=2), window_p.sum(axis=2)
    total_den = float(total_a.sum())
    return {
        "window": _error_metrics(window_a, window_p),
        "day": _error_metrics(lead_a, lead_p),
        "total": {
            "rows": int(total_a.size),
            "wape": round(float(np.abs(total_a - total_p).sum() / total_den), 6) if total_den else None,
            "bias": round(float((total_p.sum() - total_a.sum()) / total_den), 6) if total_den else None,
        },
    }


def _make_estimators(names):
    available = {
        "random_forest_engineered": lambda: RandomForestRegressor(
            n_estimators=100, max_depth=12, min_samples_split=4, random_state=42, n_jobs=-1
        ),
        "gradient_boosting_engineered": lambda: GradientBoostingRegressor(
            n_estimators=100, learning_rate=0.05, max_depth=3, random_state=42
        ),
    }
    unknown = [n for n in names if n not in available]
    if unknown:
        raise ValueError(f"Mô hình không hỗ trợ: {unknown}. Chọn trong {sorted(available)}.")
    return {name: available[name]() for name in names}


def evaluate_horizons(train, test, models=("random_forest_engineered",), origin_step=5, horizons=HORIZONS):
    """Trả về báo cáo sai số theo độ dài dự báo cho các baseline và mô hình."""
    train, test = _validate_inputs(train, test)
    train_features, _ = _make_features(train, test)
    keys, dates, history = build_history(train, test)
    calendar = _calendar_table(dates)

    first_test = int(dates.get_loc(pd.to_datetime(test["date"]).min()))
    last_pos = len(dates) - 1
    usable = [h for h in horizons if first_test - 1 + h <= last_pos]
    if not usable:
        raise ValueError(f"Tập test quá ngắn để đo độ dài dự báo nhỏ nhất ({min(horizons)} ngày).")
    max_h = max(usable)
    origins = list(range(first_test - 1, last_pos - max_h + 1, max(1, int(origin_step))))
    if not origins:
        raise ValueError("Không có điểm xuất phát nào đủ chỗ cho độ dài dự báo lớn nhất.")

    index = pd.MultiIndex.from_frame(keys)
    by_weekday = train.assign(_wd=train["date"].dt.dayofweek).groupby([*KEY, "_wd"])[TARGET].mean().unstack("_wd")
    weekday_means = by_weekday.reindex(index).reindex(columns=range(7)).to_numpy(dtype=float, copy=True)
    fallback = train.groupby(KEY)[TARGET].mean().reindex(index).to_numpy(dtype=float)
    missing = np.isnan(weekday_means)
    weekday_means[missing] = np.broadcast_to(fallback[:, None], weekday_means.shape)[missing]

    fitted = {}
    for name, estimator in _make_estimators(models).items():
        pipeline = _estimator_pipeline(estimator, ENGINEERED)
        pipeline.fit(train_features[[*CATEGORY_COLUMNS, *ENGINEERED]], train_features[TARGET])
        fitted[name] = pipeline

    actual = np.stack([history[:, o + 1:o + 1 + max_h] for o in origins])
    predicted = {name: [] for name in [*BASELINES, *fitted]}
    for origin in origins:
        for name, values in baseline_forecasts(history, keys, weekday_means, dates, origin, max_h).items():
            predicted[name].append(values)
        for name, pipeline in fitted.items():
            predicted[name].append(recursive_forecast(pipeline, history, keys, calendar, origin, max_h))
    predicted = {name: np.stack(values) for name, values in predicted.items()}

    results = {name: {str(h): horizon_metrics(actual, predicted[name], h) for h in usable} for name in predicted}
    best_baseline = {
        str(h): min(BASELINES, key=lambda b: results[b][str(h)]["window"]["wape"] or float("inf")) for h in usable
    }
    return {
        "evaluation": "recursive_multi_step_from_multiple_origins",
        "horizons_days": usable,
        "skipped_horizons": [h for h in horizons if h not in usable],
        "origins": len(origins),
        "origin_step_days": int(origin_step),
        "first_origin": str(dates[origins[0]].date()),
        "last_origin": str(dates[origins[-1]].date()),
        "series_count": int(len(keys)),
        "models": results,
        "best_baseline_by_horizon": best_baseline,
        "notes": [
            "Dự báo đệ quy: dự đoán của các ngày trước được dùng làm đặc trưng lag cho ngày sau; nhu cầu thực sau điểm xuất phát không được dùng.",
            "WAPE = tổng sai số tuyệt đối / tổng nhu cầu thực. 'total' so tổng cầu h ngày (quan trọng cho điểm đặt hàng).",
            data_note(),
        ],
    }


def _pct(value):
    return "-" if value is None else f"{value * 100:.1f}%"


def render_markdown(report: dict) -> str:
    models = report["models"]
    lines = [
        "# Sai số dự báo theo độ dài dự báo",
        "",
        "> Tệp này do `python -m data_prep.s10_horizon_evaluation` sinh ra. Chạy lại để cập nhật.",
        "",
        f"Dự báo đệ quy từ {report['origins']} điểm xuất phát (cách nhau {report['origin_step_days']} ngày, "
        f"từ {report['first_origin']} đến {report['last_origin']}) trên {report['series_count']} chuỗi. "
        f"{report['notes'][2]}",
        "",
        "Mỗi hàng là một độ dài dự báo. **WAPE cửa sổ**: sai số trên các ngày 1 đến h. **WAPE ngày h**: sai số riêng "
        "của ngày thứ h. **WAPE tổng cầu**: lệch giữa tổng cầu dự báo và thực tế trong h ngày (số mà đề xuất đặt hàng "
        "dùng). **Lệch**: dự báo cao (+) hay thấp (-) hơn thực tế.",
        "",
    ]
    for name, by_h in models.items():
        lines += [f"## {name}", "", "| Độ dài | WAPE cửa sổ | MAE cửa sổ | WAPE ngày h | WAPE tổng cầu | Lệch |", "|---:|---:|---:|---:|---:|---:|"]
        for h in report["horizons_days"]:
            m = by_h[str(h)]
            lines.append(
                f"| {h} ngày | {_pct(m['window']['wape'])} | {m['window']['mae']:.2f} | {_pct(m['day']['wape'])} | "
                f"{_pct(m['total']['wape'])} | {_pct(m['total']['bias'])} |"
            )
        lines.append("")
    lines += ["## So với baseline tốt nhất (WAPE cửa sổ)", "", "| Độ dài | Baseline tốt nhất | Mô hình | WAPE baseline | WAPE mô hình | Giảm sai số |", "|---:|---|---|---:|---:|---:|"]
    for h in report["horizons_days"]:
        base = report["best_baseline_by_horizon"][str(h)]
        base_wape = models[base][str(h)]["window"]["wape"]
        for name in models:
            if name in BASELINES:
                continue
            wape = models[name][str(h)]["window"]["wape"]
            gain = (base_wape - wape) / base_wape if base_wape else None
            lines.append(f"| {h} ngày | {base} | {name} | {_pct(base_wape)} | {_pct(wape)} | {_pct(gain)} |")
    if report["skipped_horizons"]:
        lines += ["", f"Không đo được các độ dài {report['skipped_horizons']} vì tập test quá ngắn."]
    lines += [
        "",
        "## Cách đọc",
        "",
        "1. Sai số tăng theo độ dài dự báo vì dự báo đệ quy cộng dồn sai số của chính nó. Con số một ngày trong `MODEL_EVALUATION_KAGGLE.md` là mức tốt nhất, không phải mức của dự báo 30 ngày.",
        "2. Sai số tổng cầu thường nhỏ hơn sai số từng ngày vì sai số ngược dấu của các ngày triệt tiêu nhau. Đề xuất đặt hàng dựa trên tổng cầu trong thời gian giao hàng nên chịu ảnh hưởng của cột này nhiều hơn.",
        "3. Nếu cột Lệch luôn âm, mô hình dự báo thấp hơn thực tế và dễ gây thiếu hàng; nếu luôn dương thì dễ gây tồn nhiều. Đây là lý do đề xuất đặt hàng có tồn kho an toàn.",
        "4. Kết quả đo trên dữ liệu ghi ở đầu tệp. Với dữ liệu bán hàng thật của doanh nghiệp cần chạy lại.",
    ]
    return "\n".join(lines) + "\n"


def main(argv=None) -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--train", type=Path, default=TRAIN_FILE)
    parser.add_argument("--test", type=Path, default=TEST_FILE)
    parser.add_argument("--output-dir", type=Path, default=PROCESSED_DIR)
    parser.add_argument("--report", type=Path, default=DOCS_AI_DIR / "HORIZON_EVALUATION.md")
    parser.add_argument("--origin-step", type=int, default=5, help="khoảng cách (ngày) giữa các điểm xuất phát")
    parser.add_argument("--train-last-days", type=int, default=None, help="chỉ huấn luyện trên N ngày gần nhất")
    parser.add_argument(
        "--models", default="random_forest_engineered",
        help="danh sách cách nhau bởi dấu phẩy: random_forest_engineered, gradient_boosting_engineered",
    )
    args = parser.parse_args(argv)

    ensure_dirs()
    read = dict(parse_dates=["date"], dtype={"sku": str, "warehouse_code": str})
    train = pd.read_csv(args.train, **read)
    test = pd.read_csv(args.test, **read)
    if args.train_last_days:
        cutoff = train["date"].max() - pd.Timedelta(days=args.train_last_days)
        train = train[train["date"] > cutoff].reset_index(drop=True)
    names = tuple(n.strip() for n in args.models.split(",") if n.strip())
    report = evaluate_horizons(train, test, names, args.origin_step)
    if args.train_last_days:
        report["train_window_days"] = args.train_last_days
    args.output_dir.mkdir(parents=True, exist_ok=True)
    out = args.output_dir / "horizon_metrics.json"
    out.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(render_markdown(report), encoding="utf-8")
    print(render_markdown(report))
    print(f"-> {out}\n-> {args.report}")


if __name__ == "__main__":
    main()

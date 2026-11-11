"""Kiểm thử data_prep.check_readiness bằng dữ liệu nhỏ dựng trong thư mục tạm."""
import json

import pandas as pd
import pytest

from data_prep import check_readiness as cr

COLS = ["date", "sku", "warehouse_code", "units_sold", "unit_price", "promotion_flag", "is_imputed", "is_outlier_capped"]


def _series(sku, wh, start, days, value=5):
    dates = pd.date_range(start, periods=days, freq="D")
    return pd.DataFrame({
        "date": dates, "sku": sku, "warehouse_code": wh, "units_sold": value,
        "unit_price": 100.0, "promotion_flag": 0, "is_imputed": 0, "is_outlier_capped": 0,
    })[COLS]


def _build(root, train_days=300, test_days=60, synthetic=False, version="2.0.0"):
    raw, proc, models = root / "data" / "raw", root / "data" / "processed", root / "models"
    raw.mkdir(parents=True), proc.mkdir(parents=True), models.mkdir()
    train = _series("SKU-A", "WH1", "2025-01-01", train_days)
    test = _series("SKU-A", "WH1", train["date"].max() + pd.Timedelta(days=1), test_days)
    pd.concat([train, test]).to_csv(proc / "sales_clean.csv", index=False)
    train.to_csv(proc / "train.csv", index=False)
    test.to_csv(proc / "test.csv", index=False)
    pd.concat([train, test]).to_csv(raw / "sales_raw.csv", index=False)
    (raw / "data_source.json").write_text(json.dumps({"source": "csv", "synthetic": synthetic, "input": "x.csv"}))
    (models / "demand_forecast_model.json").write_text(json.dumps({"version": version, "trained_at": "2026-01-01"}))


def _by_name(checks):
    return {c.name: c for c in checks}


def test_missing_files_fail_fast(tmp_path):
    checks = cr.run_checks(tmp_path)
    assert len(checks) == 1
    assert checks[0].status == cr.FAIL
    assert "run_data_prep" in checks[0].detail


def test_healthy_dataset_has_no_failures(tmp_path):
    _build(tmp_path)
    checks = cr.run_checks(tmp_path)
    assert all(c.status != cr.FAIL for c in checks)
    assert _by_name(checks)["Nguồn dữ liệu"].status == cr.PASS
    assert cr.main(["--root", str(tmp_path)]) == 0


def test_synthetic_source_is_flagged(tmp_path):
    _build(tmp_path, synthetic=True)
    assert _by_name(cr.run_checks(tmp_path))["Nguồn dữ liệu"].status == cr.WARN


def test_short_history_warns(tmp_path):
    _build(tmp_path, train_days=60)
    checks = _by_name(cr.run_checks(tmp_path))
    assert checks["Lịch sử huấn luyện >= 180 ngày"].status == cr.WARN


def test_overlapping_split_fails(tmp_path):
    _build(tmp_path)
    proc = tmp_path / "data" / "processed"
    train = pd.read_csv(proc / "train.csv", parse_dates=["date"])
    test = pd.read_csv(proc / "test.csv", parse_dates=["date"])
    test["date"] = test["date"] - pd.Timedelta(days=100)  # test lùi vào vùng train
    test.to_csv(proc / "test.csv", index=False)
    checks = _by_name(cr.run_checks(tmp_path))
    assert checks["Chia train/test theo thời gian"].status == cr.FAIL
    assert cr.main(["--root", str(tmp_path)]) == 1


def test_negative_and_duplicate_rows_fail(tmp_path):
    _build(tmp_path)
    path = tmp_path / "data" / "processed" / "sales_clean.csv"
    df = pd.read_csv(path)
    df.loc[0, "units_sold"] = -3
    df = pd.concat([df, df.iloc[[1]]])
    df.to_csv(path, index=False)
    check = _by_name(cr.run_checks(tmp_path))["Chất lượng dữ liệu sau làm sạch"]
    assert check.status == cr.FAIL
    assert "âm" in check.detail and "trùng" in check.detail


def test_unknown_skus_warn_and_known_pass(tmp_path):
    _build(tmp_path)
    warn = _by_name(cr.run_checks(tmp_path, known_skus={"OTHER"}))["SKU khớp sản phẩm trong DB"]
    assert warn.status == cr.WARN and "SKU-A" in warn.detail
    ok = _by_name(cr.run_checks(tmp_path, known_skus={"SKU-A"}))["SKU khớp sản phẩm trong DB"]
    assert ok.status == cr.PASS


def test_old_model_version_warns(tmp_path):
    _build(tmp_path, version="1.0.0")
    assert _by_name(cr.run_checks(tmp_path))["Mô hình đã huấn luyện"].status == cr.WARN


def test_missing_columns_fail(tmp_path):
    _build(tmp_path)
    path = tmp_path / "data" / "processed" / "sales_clean.csv"
    pd.read_csv(path).drop(columns=["promotion_flag"]).to_csv(path, index=False)
    check = _by_name(cr.run_checks(tmp_path))["Đủ cột chuẩn"]
    assert check.status == cr.FAIL and "promotion_flag" in check.detail


def test_report_contains_summary(tmp_path):
    _build(tmp_path)
    text = cr.format_report(cr.run_checks(tmp_path))
    assert "Tổng:" in text and "[ OK ]" in text


def test_real_pipeline_output_passes_structure():
    """Không phụ thuộc dữ liệu thật: chỉ đảm bảo tên các kiểm tra ổn định."""
    names = {"Có đủ file dữ liệu"}
    assert names <= {c.name for c in cr.run_checks(cr.ROOT / "__no_such_dir__")}

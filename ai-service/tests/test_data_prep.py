"""Test pipeline chuẩn bị dữ liệu. Chạy: cd ai-service && python -m unittest discover -s tests -v"""
import unittest
import numpy as np
import pandas as pd
from data_prep.s01_collect_sales_dataset import generate_clean_truth, inject_dirt
from data_prep.s02_clean_data import clean, parse_dates
from data_prep.s03_eda import classify_demand
from data_prep.s04_prepare_training_dataset import split_by_time, validate
from data_prep.s05_calendar_features import add_calendar_features
from data_prep.s07_baseline_forecast import evaluate_baselines
from data_prep.common import CANONICAL_COLUMNS


def raw_rows(rows):
    return pd.DataFrame(rows, columns=CANONICAL_COLUMNS).astype(str).replace("nan", np.nan).replace("None", np.nan)


def r(date, sku, wh, units, price="100", promo="0"):
    return [date, sku, wh, units, price, promo]


class CleaningTests(unittest.TestCase):
    def test_parse_mixed_date_formats(self):
        out = parse_dates(pd.Series(["2025-03-15", "15/03/2025", "garbage"]))
        self.assertEqual(out.iloc[0], out.iloc[1])
        self.assertTrue(pd.isna(out.iloc[2]))

    def test_normalizes_keys_and_drops_missing_key(self):
        df, rep = clean(raw_rows([r("2025-01-01", " prd-a ", "kho-1", "5"), r("2025-01-02", "PRD-A", "KHO-1", "6"),
                                  r("2025-01-03", None, "KHO-1", "7")]))
        self.assertEqual(df["sku"].unique().tolist(), ["PRD-A"])
        self.assertEqual(rep["dropped_missing_key"], 1)

    def test_duplicates_and_conflicts(self):
        rows = [r("2025-01-01", "A", "W", "5"), r("2025-01-01", "A", "W", "5"),   # trùng hoàn toàn
                r("2025-01-02", "A", "W", "6"), r("2025-01-02", "A", "W", "9")]    # trùng khóa, khác số liệu
        df, rep = clean(raw_rows(rows))
        self.assertEqual(rep["exact_duplicates_dropped"], 1)
        self.assertEqual(rep["key_conflicts_dropped"], 1)
        self.assertEqual(len(df), 2)
        self.assertEqual(int(df.loc[df["date"] == "2025-01-02", "units_sold"].iloc[0]), 9)   # giữ dòng cuối

    def test_negative_units_not_kept_and_gap_filled(self):
        rows = [r(f"2025-01-{d:02d}", "A", "W", str(10)) for d in (1, 2, 4, 5, 6, 7, 8)]  # thiếu ngày 3
        rows[1][3] = "-4"
        df, rep = clean(raw_rows(rows))
        self.assertEqual(len(df), 8)
        self.assertTrue((df["units_sold"] >= 0).all())
        self.assertEqual(rep["calendar_gap_rows_added"], 1)
        self.assertEqual(int(df["is_imputed"].sum()), 2)   # ngày thiếu + giá trị âm

    def test_outlier_is_capped_not_dropped(self):
        # Cần đủ ngày mỗi thứ trong tuần (~17 điểm/nhóm) để phân vị không bị outlier làm lệch
        days = pd.date_range("2025-01-01", periods=120)
        rows = [r(d.strftime("%Y-%m-%d"), "A", "W", "10") for d in days]
        rows[7][3] = "5000"
        df, rep = clean(raw_rows(rows))
        self.assertEqual(len(df), 120)
        self.assertEqual(rep["outliers_capped"], 1)
        self.assertLess(df["units_sold"].max(), 100)

    def test_full_pipeline_on_synthetic_data_is_valid(self):
        truth = generate_clean_truth(seed=1).query("date < '2025-01-01'")
        dirty = inject_dirt(truth, seed=2)
        df, rep = clean(dirty.astype(str).replace({"nan": np.nan, "<NA>": np.nan}))
        self.assertEqual(df.isna().sum().sum(), 0)
        self.assertGreaterEqual(df["units_sold"].min(), 0)
        self.assertFalse(df.duplicated(["date", "sku", "warehouse_code"]).any())
        self.assertEqual(len(df), truth.groupby(["sku", "warehouse_code"]).ngroups * truth["date"].nunique())
        # Sau làm sạch, tổng lượng bán phải gần dữ liệu gốc (sai lệch < 3%)
        self.assertAlmostEqual(df["units_sold"].sum() / truth["units_sold"].sum(), 1.0, delta=0.03)


class EdaTests(unittest.TestCase):
    def test_demand_classification(self):
        self.assertEqual(classify_demand(pd.Series([10, 11, 9, 10, 12, 10]))["class"], "smooth")
        self.assertEqual(classify_demand(pd.Series([0, 0, 0, 5, 0, 0, 0, 6, 0, 0]))["class"], "intermittent")
        self.assertEqual(classify_demand(pd.Series([0, 0, 0, 1, 0, 0, 0, 80, 0, 0]))["class"], "lumpy")


class SplitTests(unittest.TestCase):
    def setUp(self):
        dates = pd.date_range("2025-01-01", periods=100)
        self.df = pd.DataFrame({"date": np.tile(dates, 2), "sku": "A", "warehouse_code": np.repeat(["W1", "W2"], 100),
                                "units_sold": 3, "unit_price": 1.0, "promotion_flag": 0,
                                "is_imputed": 0, "is_outlier_capped": 0})

    def test_time_split_has_no_leakage(self):
        train, test, cutoff = split_by_time(self.df, 30)
        self.assertLess(train["date"].max(), test["date"].min())
        self.assertEqual(test["date"].nunique(), 30)
        self.assertEqual(validate(train, test, self.df), [])

    def test_validate_detects_leakage_and_gaps(self):
        train, test, _ = split_by_time(self.df, 30)
        self.assertTrue(any("RÒ RỈ" in p for p in validate(pd.concat([train, test.head(2)]), test, self.df)))
        gappy = train.drop(train.index[10])
        self.assertTrue(any("đứt quãng" in p for p in validate(gappy, test, pd.concat([gappy, test]))))


class CalendarFeatureTests(unittest.TestCase):
    def test_creates_calendar_features(self):
        frame = pd.DataFrame({"date": ["2025-01-01", "2025-01-04"], "units_sold": [2, 5]})

        result = add_calendar_features(frame)

        self.assertEqual(result["day_of_week"].tolist(), [2, 5])
        self.assertEqual(result["is_weekend"].tolist(), [0, 1])
        self.assertAlmostEqual(result.loc[0, "day_of_week_sin"], np.sin(2 * np.pi * 2 / 7))

    def test_rejects_invalid_dates(self):
        with self.assertRaisesRegex(ValueError, "date"):
            add_calendar_features(pd.DataFrame({"date": ["not-a-date"]}))


class BaselineTests(unittest.TestCase):
    def test_baselines_use_training_history_and_score_holdout(self):
        dates = pd.date_range("2025-01-01", periods=14)
        frame = pd.DataFrame({
            "date": dates,
            "sku": "A",
            "warehouse_code": "W1",
            "units_sold": np.tile(np.arange(1, 8), 2),
        })
        train, test = frame.iloc[:7].copy(), frame.iloc[7:].copy()
        result, metrics = evaluate_baselines(train, test)
        self.assertEqual(result["seasonal_naive_7d"].tolist(), test["units_sold"].tolist())
        self.assertEqual(metrics["models"]["seasonal_naive_7d"]["mae"], 0)
        self.assertEqual(metrics["models"]["seasonal_naive_7d"]["wape"], 0)
        self.assertEqual(metrics["models"]["weekday_mean"]["mae"], 0)

    def test_baseline_rejects_leakage_and_cold_start(self):
        train = pd.DataFrame({
            "date": ["2025-01-01"], "sku": ["A"], "warehouse_code": ["W1"], "units_sold": [1],
        })
        overlapping_test = train.copy()
        with self.assertRaisesRegex(ValueError, "chồng lấn"):
            evaluate_baselines(train, overlapping_test)
        cold_start_test = pd.DataFrame({
            "date": ["2025-01-02"], "sku": ["B"], "warehouse_code": ["W1"], "units_sold": [1],
        })
        with self.assertRaisesRegex(ValueError, "cold-start"):
            evaluate_baselines(train, cold_start_test)


class PipelineIntegrationTests(unittest.TestCase):
    def test_split_calendar_features_and_baseline_work_together(self):
        dates = pd.date_range("2025-01-01", periods=21)
        frame = pd.DataFrame({
            "date": dates,
            "sku": "A",
            "warehouse_code": "W1",
            "units_sold": np.arange(1, 22),
            "unit_price": 100.0,
            "promotion_flag": 0,
            "is_imputed": 0,
            "is_outlier_capped": 0,
        })
        train, test, _ = split_by_time(frame, 7)
        train_features = add_calendar_features(train)
        test_features = add_calendar_features(test)
        predictions, metrics = evaluate_baselines(train_features, test_features)

        self.assertEqual(len(train_features) + len(test_features), len(frame))
        self.assertEqual(len(predictions), 7)
        self.assertEqual(metrics["models"]["seasonal_naive_7d"]["rows"], 7)


if __name__ == "__main__":
    unittest.main()

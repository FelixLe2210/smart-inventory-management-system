import unittest

import numpy as np
import pandas as pd

from data_prep.s08_model_evaluation import _make_features, evaluate_models


def make_series():
    rows = []
    dates = pd.date_range("2025-01-01", periods=84)
    for sku, warehouse, base in (("A", "W1", 10), ("B", "W2", 30)):
        for index, day in enumerate(dates):
            rows.append(
                {
                    "date": day,
                    "sku": sku,
                    "warehouse_code": warehouse,
                    "units_sold": base + day.dayofweek + index // 14,
                    "is_imputed": int(index % 17 == 0),
                }
            )
    frame = pd.DataFrame(rows)
    cutoff = dates[69]
    return frame[frame["date"] <= cutoff].copy(), frame[frame["date"] > cutoff].copy()


class ModelEvaluationTests(unittest.TestCase):
    def test_feature_lags_only_use_previous_observations(self):
        train, test = make_series()
        train_features, test_features = _make_features(train, test)
        first_test = test_features[
            (test_features["sku"] == "A")
            & (test_features["date"] == test["date"].min().strftime("%Y-%m-%d"))
        ].iloc[0]
        expected_previous = train.loc[
            (train["sku"] == "A") & (train["warehouse_code"] == "W1")
        ].sort_values("date").iloc[-1]["units_sold"]
        self.assertEqual(first_test["lag_1"], expected_previous)
        self.assertEqual(len(train_features), len(train) - 28 * 2)
        self.assertEqual(len(test_features), len(test))

    def test_candidates_share_holdout_and_cover_multiple_series(self):
        train, test = make_series()
        predictions, report = evaluate_models(train, test)

        self.assertEqual(report["evaluation"], "chronological_walk_forward_one_day_ahead")
        self.assertEqual(report["series_count"], 2)
        self.assertEqual(report["scored_rows"], len(test))
        self.assertEqual(report["scored_imputed_rows"], int(test["is_imputed"].sum()))
        for name in (
            "seasonal_naive_7d",
            "weekday_mean",
            "random_forest_calendar",
            "random_forest_engineered",
            "gradient_boosting_engineered",
        ):
            self.assertEqual(report["models"][name]["status"], "evaluated")
            self.assertEqual(report["models"][name]["metrics"]["rows"], len(test))
            self.assertGreaterEqual(report["models"][name]["metrics"]["mae"], 0)
        self.assertEqual(set(predictions["sku"]), {"A", "B"})
        self.assertTrue((predictions["predicted"] >= 0).all())
        self.assertIn("lag_28", report["feature_sets"]["random_forest_engineered"])

    def test_evaluation_rejects_time_leakage_and_cold_start(self):
        train, test = make_series()
        overlapping = pd.concat([train, test.iloc[:1]], ignore_index=True)
        with self.assertRaisesRegex(ValueError, "chồng lấn"):
            evaluate_models(overlapping, test)

        cold_start = test.copy()
        cold_start.loc[cold_start["sku"] == "B", "sku"] = "C"
        with self.assertRaisesRegex(ValueError, "cold-start"):
            evaluate_models(train, cold_start)


if __name__ == "__main__":
    unittest.main()

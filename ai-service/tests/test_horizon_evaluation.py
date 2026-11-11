import math
import unittest

import numpy as np
import pandas as pd

from data_prep.s10_horizon_evaluation import (
    _calendar_table,
    baseline_forecasts,
    build_history,
    evaluate_horizons,
    horizon_metrics,
    recursive_forecast,
    render_markdown,
)


def make_series(train_days=90, test_days=40):
    rows = []
    dates = pd.date_range("2025-01-01", periods=train_days + test_days)
    for sku, warehouse, base in (("A", "W1", 10), ("B", "W2", 30)):
        for index, day in enumerate(dates):
            rows.append(
                {"date": day, "sku": sku, "warehouse_code": warehouse,
                 "units_sold": base + 3 * day.dayofweek + index // 20}
            )
    frame = pd.DataFrame(rows)
    cutoff = dates[train_days - 1]
    return frame[frame["date"] <= cutoff].copy(), frame[frame["date"] > cutoff].copy()


class SeasonalNaiveModel:
    """Mô hình giả: dự đoán bằng lag_7, để kiểm tra phần dự báo đệ quy có đúng như công thức."""

    def predict(self, frame):
        return frame["lag_7"].to_numpy(dtype=float)


class HorizonEvaluationTests(unittest.TestCase):
    def setUp(self):
        self.train, self.test = make_series()
        self.keys, self.dates, self.history = build_history(self.train, self.test)
        self.calendar = _calendar_table(self.dates)
        self.origin = len(self.train[self.train["sku"] == "A"]) - 1

    def test_recursive_forecast_follows_the_lag_7_formula(self):
        steps = 20
        got = recursive_forecast(SeasonalNaiveModel(), self.history, self.keys, self.calendar, self.origin, steps)
        for k in range(1, steps + 1):
            expected = self.history[:, self.origin + k - 7 * math.ceil(k / 7)]
            np.testing.assert_allclose(got[:, k - 1], expected)

    def test_future_actuals_are_never_used(self):
        steps = 10
        baseline = recursive_forecast(SeasonalNaiveModel(), self.history, self.keys, self.calendar, self.origin, steps)
        tampered = self.history.copy()
        tampered[:, self.origin + 1:] += 1000.0
        again = recursive_forecast(SeasonalNaiveModel(), tampered, self.keys, self.calendar, self.origin, steps)
        np.testing.assert_allclose(baseline, again)

    def test_seasonal_naive_baseline_matches_recursive_lag_7(self):
        steps = 15
        weekday_means = np.zeros((len(self.keys), 7))
        base = baseline_forecasts(self.history, self.keys, weekday_means, self.dates, self.origin, steps)
        model = recursive_forecast(SeasonalNaiveModel(), self.history, self.keys, self.calendar, self.origin, steps)
        np.testing.assert_allclose(base["seasonal_naive_7d"], model)

    def test_horizon_metrics_math(self):
        actual = np.array([[[10.0, 10.0, 10.0]]])
        predicted = np.array([[[12.0, 8.0, 11.0]]])
        m = horizon_metrics(actual, predicted, 3)
        self.assertAlmostEqual(m["window"]["mae"], (2 + 2 + 1) / 3, places=4)
        self.assertAlmostEqual(m["window"]["wape"], 5 / 30, places=5)
        self.assertAlmostEqual(m["day"]["wape"], 0.1, places=5)  # chỉ ngày thứ 3: |11-10|/10
        self.assertAlmostEqual(m["total"]["wape"], 1 / 30, places=5)  # tổng 31 so với 30
        self.assertAlmostEqual(m["total"]["bias"], 1 / 30, places=5)

    def test_evaluate_horizons_reports_every_available_horizon(self):
        report = evaluate_horizons(self.train, self.test, origin_step=5)
        self.assertEqual(report["horizons_days"], [1, 7, 14, 30])
        self.assertEqual(report["series_count"], 2)
        for name in ("seasonal_naive_7d", "weekday_mean", "random_forest_engineered"):
            for h in ("1", "7", "14", "30"):
                metrics = report["models"][name][h]
                self.assertGreaterEqual(metrics["window"]["mae"], 0)
                self.assertIsNotNone(metrics["total"]["wape"])
        text = render_markdown(report)
        self.assertIn("random_forest_engineered", text)
        self.assertIn("30 ngày", text)

    def test_short_test_set_skips_long_horizons(self):
        train, test = make_series(test_days=12)
        report = evaluate_horizons(train, test, origin_step=2)
        self.assertEqual(report["horizons_days"], [1, 7])
        self.assertEqual(report["skipped_horizons"], [14, 30])

    def test_gap_in_history_is_rejected(self):
        gap = self.train[self.train["date"] != self.train["date"].iloc[40]]
        with self.assertRaises(ValueError):
            build_history(gap, self.test)


if __name__ == "__main__":
    unittest.main()

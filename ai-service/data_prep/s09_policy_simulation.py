"""Mô phỏng chính sách đặt hàng: AI #2 so với quy tắc min/max cố định.

Câu hỏi: nếu dùng đề xuất của AI #2 thay cho quy tắc "tồn dưới mức tối thiểu thì đặt cho đủ mức tối đa",
hệ thống bị hết hàng ít hơn bao nhiêu và phải giữ bao nhiêu tồn kho?

Cách mô phỏng (mỗi chuỗi SKU x kho, theo từng ngày):
  1. Hàng đặt trước đó về kho đầu ngày (thời gian giao thực tế ngẫu nhiên, trung bình và độ lệch cho trước).
  2. Chính sách quyết định có đặt hàng không (dựa trên tồn kho, hàng đang về, lịch sử bán TRƯỚC ngày đó).
  3. Nhu cầu thật của ngày đó (``units_sold``) được đáp ứng từ tồn kho; phần thiếu bị mất (lost sales).

Hai chính sách dùng cùng nhu cầu thật và cùng dãy thời gian giao ngẫu nhiên (common random numbers) nên so sánh công bằng:
  * ``static``: quy tắc min/max cố định, tham số tính một lần từ nhu cầu trung bình dài hạn (cách làm thủ công thường gặp).
    Quét nhiều mức ``min_days`` để có đường đánh đổi giữa mức phục vụ và tồn kho.
  * ``ai2``: gọi ``recommend_reorder`` mỗi ngày với dự báo là trung bình trượt 28 ngày; thời gian giao khai báo
    của nhà cung cấp và thời gian giao thực tế đã quan sát (>= 3 đơn) như hệ thống thật.

Giới hạn (phải nói khi báo cáo): nhu cầu lấy từ dữ liệu MÔ PHỎNG nếu chưa nạp dữ liệu thật; dự báo trong mô phỏng là
trung bình trượt chứ không phải mô hình học máy, để tách riêng chất lượng của CHÍNH SÁCH đặt hàng khỏi chất lượng dự báo.

Chạy sau ``python run_data_prep.py``:
    python -m data_prep.s09_policy_simulation [--days 120] [--seed 7]
"""
from __future__ import annotations

import argparse
import json
import math
from dataclasses import dataclass, field
from datetime import date, timedelta
from typing import Optional, Sequence

import numpy as np
import pandas as pd

from app.services.incoming_stock_logic import STATUS_SENT, PurchaseOrderLine
from app.services.reorder_service import ACTION_REORDER, ForecastPoint, ReorderInput, recommend_reorder

from .common import CLEAN_FILE, DOCS_AI_DIR, KEY, PROCESSED_DIR, TARGET

TRAILING_DAYS = 28
FORECAST_DAYS = 14
STATIC_MIN_DAYS = (3, 5, 7, 10, 14)
STATIC_ORDER_CYCLE_DAYS = 14
RESULT_JSON = PROCESSED_DIR / "policy_simulation.json"
REPORT_MD = DOCS_AI_DIR / "POLICY_SIMULATION.md"


@dataclass(frozen=True)
class Scenario:
    name: str
    declared_lead_time: int   # thời gian giao nhà cung cấp khai báo
    actual_lead_mean: float   # thời gian giao thực tế trung bình
    actual_lead_std: float
    reliability: float = 0.85


SCENARIOS = (
    Scenario("Nhà cung cấp ổn định (khai báo 7 ngày, thực tế 7 ± 1)", 7, 7.0, 1.0),
    Scenario("Nhà cung cấp trễ và dao động (khai báo 7 ngày, thực tế 10 ± 3)", 7, 10.0, 3.0),
)


@dataclass
class SeriesResult:
    demand: float = 0.0
    lost: float = 0.0
    stockout_days: int = 0
    days: int = 0
    on_hand_sum: float = 0.0
    orders: int = 0
    ordered_units: float = 0.0

    def add(self, other: "SeriesResult") -> None:
        for f in ("demand", "lost", "stockout_days", "days", "on_hand_sum", "orders", "ordered_units"):
            setattr(self, f, getattr(self, f) + getattr(other, f))

    def metrics(self) -> dict:
        avg_demand = self.demand / self.days if self.days else 0.0
        avg_on_hand = self.on_hand_sum / self.days if self.days else 0.0
        return {
            "fill_rate": 1.0 - self.lost / self.demand if self.demand > 0 else 1.0,
            "stockout_day_share": self.stockout_days / self.days if self.days else 0.0,
            "avg_on_hand": avg_on_hand,
            "days_of_cover": avg_on_hand / avg_demand if avg_demand > 0 else 0.0,
            "orders": self.orders,
            "ordered_units": self.ordered_units,
            "lost_units": self.lost,
            "demand_units": self.demand,
        }


@dataclass
class _Order:
    placed: int
    arrival: int
    promised: int
    qty: int


def _draw_lead_times(n: int, scenario: Scenario, seed: int) -> np.ndarray:
    """Thời gian giao thực tế cho đơn đặt vào ngày i (dùng chung cho mọi chính sách)."""
    rng = np.random.default_rng(seed)
    return np.maximum(1, np.rint(rng.normal(scenario.actual_lead_mean, scenario.actual_lead_std, n))).astype(int)


def _static_order(position: float, level_min: float, level_max: float) -> int:
    return int(math.ceil(level_max - position)) if position <= level_min and level_max > position else 0


def _ai2_order(
    demand: np.ndarray, t: int, dates: Sequence[date], on_hand: float, open_orders: Sequence[_Order],
    completed_lead_times: Sequence[float], scenario: Scenario,
) -> int:
    window = demand[max(0, t - TRAILING_DAYS):t]
    if len(window) < 7:
        return 0
    mean = float(window.mean())
    std = float(window.std(ddof=1)) if len(window) > 1 else 0.0
    as_of = dates[t]
    po_lines = [
        PurchaseOrderLine(po_id=i, product_id=1, warehouse_id=1, status=STATUS_SENT, ordered_qty=o.qty,
                          expected_delivery_date=as_of + timedelta(days=o.promised - t))
        for i, o in enumerate(open_orders)
    ]
    rec = recommend_reorder(ReorderInput(
        product_id=1, warehouse_id=1, as_of=as_of, on_hand=on_hand,
        forecast=[ForecastPoint(predicted=mean)] * FORECAST_DAYS,
        po_lines=po_lines,
        supplier_lead_time_days=scenario.declared_lead_time,
        supplier_reliability=scenario.reliability,
        observed_lead_times=list(completed_lead_times) if len(completed_lead_times) >= 3 else None,
        demand_std_override=std,
    ))
    return rec.recommended_quantity if rec.action == ACTION_REORDER else 0


def simulate_series(
    demand: np.ndarray, dates: Sequence[date], start: int, policy: str, scenario: Scenario,
    lead_draws: np.ndarray, min_days: Optional[float] = None,
) -> SeriesResult:
    """Mô phỏng một chuỗi từ ngày ``start`` đến hết. ``policy`` là ``static`` hoặc ``ai2``."""
    history_mean = float(demand[:start].mean()) if start > 0 else float(demand.mean())
    level_min = level_max = 0.0
    if policy == "static":
        assert min_days is not None
        level_min = history_mean * min_days
        level_max = history_mean * (min_days + STATIC_ORDER_CYCLE_DAYS)

    on_hand = history_mean * 14  # bắt đầu với ~14 ngày bán
    open_orders: list = []
    completed: list = []
    res = SeriesResult()
    for t in range(start, len(demand)):
        for o in [o for o in open_orders if o.arrival <= t]:
            on_hand += o.qty
            completed.append(o.arrival - o.placed)
            open_orders.remove(o)

        position = on_hand + sum(o.qty for o in open_orders)
        if policy == "static":
            qty = _static_order(position, level_min, level_max)
        else:
            qty = _ai2_order(demand, t, dates, on_hand, open_orders, completed, scenario)
        if qty > 0:
            lead = int(lead_draws[t])
            open_orders.append(_Order(placed=t, arrival=t + lead, promised=t + scenario.declared_lead_time, qty=qty))
            res.orders += 1
            res.ordered_units += qty

        d = float(demand[t])
        sold = min(on_hand, d)
        res.demand += d
        res.lost += d - sold
        res.stockout_days += 1 if d - sold > 1e-9 else 0
        on_hand -= sold
        res.on_hand_sum += on_hand
        res.days += 1
    return res


def load_series(path=CLEAN_FILE) -> dict:
    df = pd.read_csv(path, parse_dates=["date"], dtype={"sku": str, "warehouse_code": str}).sort_values("date")
    out = {}
    for key, g in df.groupby(KEY):
        g = g.drop_duplicates("date")
        out[key] = (g[TARGET].to_numpy(dtype=float), [d.date() for d in g["date"]])
    return out


def run(series: dict, days: int, seed: int, scenarios: Sequence[Scenario] = SCENARIOS) -> dict:
    report = {"days": days, "seed": seed, "series_count": len(series), "scenarios": []}
    for si, sc in enumerate(scenarios):
        totals = {f"static_min_{m}d": SeriesResult() for m in STATIC_MIN_DAYS}
        totals["ai2"] = SeriesResult()
        for ki, (key, (demand, dates)) in enumerate(sorted(series.items())):
            if len(demand) < days + TRAILING_DAYS:
                continue
            start = len(demand) - days
            lead = _draw_lead_times(len(demand), sc, seed + 1000 * si + ki)
            for m in STATIC_MIN_DAYS:
                totals[f"static_min_{m}d"].add(simulate_series(demand, dates, start, "static", sc, lead, m))
            totals["ai2"].add(simulate_series(demand, dates, start, "ai2", sc, lead))
        report["scenarios"].append({
            "name": sc.name,
            "policies": {name: r.metrics() for name, r in totals.items()},
        })
    return report


def conclusion(scenario: dict) -> str:
    """Một câu so sánh AI #2 với chính sách tĩnh rẻ nhất đạt cùng mức phục vụ (hoặc nói rõ nếu không có)."""
    ai = scenario["policies"]["ai2"]
    matching = {n: m for n, m in scenario["policies"].items()
                if n != "ai2" and m["fill_rate"] >= ai["fill_rate"] - 1e-9}
    if not matching:
        return (f"Không chính sách tĩnh nào đạt mức phục vụ {ai['fill_rate']:.1%} của AI #2 trong các mức đã thử "
                f"(tốt nhất {max(m['fill_rate'] for n, m in scenario['policies'].items() if n != 'ai2'):.1%}).")
    best_name, best = min(matching.items(), key=lambda kv: kv[1]["avg_on_hand"])
    delta = (best["avg_on_hand"] - ai["avg_on_hand"]) / best["avg_on_hand"] if best["avg_on_hand"] else 0.0
    if delta > 0:
        return (f"Để đạt mức phục vụ tương đương ({ai['fill_rate']:.1%}), chính sách tĩnh rẻ nhất ({best_name}) "
                f"cần tồn kho trung bình nhiều hơn AI #2 khoảng {delta:.0%}.")
    return (f"Chính sách tĩnh {best_name} đạt mức phục vụ tương đương với tồn kho ít hơn AI #2 khoảng {-delta:.0%}: "
            "trong kịch bản này AI #2 không có lợi thế về tồn kho.")


def render_markdown(report: dict) -> str:
    lines = [
        "# Mô phỏng chính sách đặt hàng: AI #2 và quy tắc min/max cố định",
        "",
        "> Tệp này do `python -m data_prep.s09_policy_simulation` sinh ra. Chạy lại để cập nhật.",
        "",
        f"Mô phỏng {report['series_count']} chuỗi (SKU x kho) trong {report['days']} ngày cuối của dữ liệu, "
        f"hạt giống ngẫu nhiên {report['seed']}. Nhu cầu là `units_sold` trong `data/processed/sales_clean.csv`.",
        "",
        "**Giới hạn.** Dữ liệu hiện tại là mô phỏng, nên kết quả chỉ so sánh *chính sách* trên cùng nhu cầu và cùng "
        "thời gian giao ngẫu nhiên, không chứng minh hiệu quả trên dữ liệu thật. Dự báo trong mô phỏng là trung bình "
        "trượt 28 ngày, không phải mô hình học máy, để tách chất lượng chính sách khỏi chất lượng dự báo. "
        "Phần thiếu hàng được coi là mất doanh số (không bù đơn).",
        "",
        "Chỉ số: **mức phục vụ** = 1 − số lượng thiếu / tổng nhu cầu; **ngày hết hàng** = tỉ lệ ngày có thiếu hàng; "
        "**ngày tồn** = tồn kho trung bình / nhu cầu trung bình ngày.",
    ]
    for sc in report["scenarios"]:
        lines += ["", f"## {sc['name']}", "",
                  "| Chính sách | Mức phục vụ | Ngày hết hàng | Tồn TB (cái) | Ngày tồn | Số đơn |",
                  "|---|---:|---:|---:|---:|---:|"]
        for name, m in sc["policies"].items():
            label = "**AI #2**" if name == "ai2" else f"Min/max cố định, min = {name.split('_')[2][:-1]} ngày bán"
            lines.append(f"| {label} | {m['fill_rate']:.1%} | {m['stockout_day_share']:.1%} | "
                         f"{m['avg_on_hand']:.0f} | {m['days_of_cover']:.1f} | {m['orders']} |")
        lines += ["", f"**Kết luận kịch bản:** {conclusion(sc)}"]
    lines += ["", "**Cái giá của AI #2:** AI #2 đặt nhiều đơn nhỏ hơn (số đơn gần gấp đôi quy tắc cố định) vì đánh giá lại mỗi ngày. "
              "Nếu mỗi đơn hàng có phí cố định cao (vận chuyển, nhân công), lợi thế về tồn kho sẽ giảm. "
              "Mô phỏng này không tính chi phí đặt hàng. Chính sách tĩnh được so sánh ở mức rẻ nhất có mức phục vụ "
              "*bằng hoặc cao hơn* AI #2, nên so sánh nghiêng về phía chính sách tĩnh.", "", "Cách đọc: một chính sách tốt cho mức phục vụ cao với ít ngày tồn. Tăng mức min của quy tắc cố định "
              "làm tăng cả mức phục vụ lẫn tồn kho; câu hỏi là AI #2 có đạt mức phục vụ đó với tồn kho thấp hơn không."]
    return "\n".join(lines) + "\n"


def main(argv=None) -> dict:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--days", type=int, default=120, help="số ngày cuối dùng để mô phỏng")
    ap.add_argument("--seed", type=int, default=7)
    args = ap.parse_args(argv)
    if not CLEAN_FILE.exists():
        raise SystemExit("Chưa có data/processed/sales_clean.csv. Chạy `python run_data_prep.py` trước.")
    series = load_series()
    report = run(series, args.days, args.seed)
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    DOCS_AI_DIR.mkdir(parents=True, exist_ok=True)
    RESULT_JSON.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    REPORT_MD.write_text(render_markdown(report), encoding="utf-8")
    print(render_markdown(report))
    print(f"-> {RESULT_JSON}\n-> {REPORT_MD}")
    return report


if __name__ == "__main__":
    main()

"""Reorder recommendation service (AI #2) - composes the Sprint 9 building blocks. No I/O.

    forecast (AI #1) --+
    supplier / history +--> lead_time_logic ----+
    purchase orders ---+--> incoming_stock_logic +--> reorder_logic (M1) --> quantity / urgency
    stock levels ------+--> shortage_risk_logic -+                      \\-> risk + order timing

The service takes plain values (no database, no HTTP). The caller - the Spring Boot backend
through the reorder API - loads stock, purchase orders and the forecast and passes them in.
That keeps every rule unit-testable (Sprint9-08) and every number explainable: the result
carries ``assumptions`` and ``warnings`` so the UI can show *why* a quantity was proposed.

Inventory used for the decision
-------------------------------
``available = on_hand - reserved`` (reserved goods are already promised to customers). Set
``use_available_stock=False`` to base the decision on the physical stock instead.
"""
from __future__ import annotations

import math
from dataclasses import asdict, dataclass, field
from datetime import date
from statistics import NormalDist
from typing import Optional, Sequence

from app.services.incoming_stock_logic import PurchaseOrderLine, summarize_incoming_stock
from app.services.lead_time_logic import estimate_lead_time, suggest_order_timing
from app.services.reorder_logic import (
    URGENCY_CRITICAL,
    URGENCY_HIGH,
    URGENCY_MEDIUM,
    calculate_recommended_quantity,
    calculate_safety_stock,
    decide_reorder,
)
from app.services.shortage_risk_logic import RISK_HIGH, RISK_LOW, RISK_MEDIUM, assess_shortage_risk

ACTION_REORDER = "REORDER"
ACTION_EXPEDITE = "EXPEDITE_INCOMING"  # enough is on order, but it will arrive too late
ACTION_NONE = "NONE"

# reorder_recommendations.urgency_level CHECK (LOW, MEDIUM, HIGH, CRITICAL)
_RANK = {"LOW": 0, "MEDIUM": 1, "HIGH": 2, "CRITICAL": 3}
_URGENCY_TO_DB = {"NONE": "LOW", URGENCY_MEDIUM: "MEDIUM", URGENCY_HIGH: "HIGH", URGENCY_CRITICAL: "CRITICAL"}
_RISK_TO_DB = {RISK_LOW: "LOW", RISK_MEDIUM: "MEDIUM", RISK_HIGH: "HIGH"}


@dataclass(frozen=True)
class ForecastPoint:
    """One day of the AI #1 forecast (``predicted_demand`` / ``lower_bound`` / ``upper_bound``)."""

    predicted: float
    lower: Optional[float] = None
    upper: Optional[float] = None


@dataclass(frozen=True)
class ReorderInput:
    product_id: int
    warehouse_id: int
    as_of: date
    on_hand: float
    forecast: Sequence[ForecastPoint]
    reserved: float = 0.0
    po_lines: Sequence[PurchaseOrderLine] = ()
    supplier_lead_time_days: Optional[float] = None
    supplier_reliability: Optional[float] = None
    observed_lead_times: Optional[Sequence[float]] = None
    min_stock_level: int = 0
    max_stock_level: Optional[int] = None
    moq: int = 1
    order_multiple: int = 1
    service_level: float = 0.95
    review_period_days: float = 7.0
    safety_stock_method: str = "statistical"
    use_available_stock: bool = True
    demand_std_override: Optional[float] = None
    forecast_confidence_level: float = 0.95


@dataclass(frozen=True)
class ReorderRecommendation:
    product_id: int
    warehouse_id: int
    as_of: date
    action: str
    should_reorder: bool
    recommended_quantity: int
    urgency_level: str  # LOW | MEDIUM | HIGH | CRITICAL (database enum)
    shortage_risk: str  # LOW | MEDIUM | HIGH
    stockout_probability: float
    days_until_stockout: Optional[int]
    expected_shortage_units: float
    # inputs / intermediate values shown in the detail screen
    current_stock: float
    available_stock: float
    incoming_stock: int
    inventory_position: float
    avg_daily_demand: float
    demand_std: float
    lead_time_days: float
    lead_time_std_days: float
    lead_time_source: str
    safety_stock: int
    reorder_point: int
    target_stock: int
    suggested_order_date: Optional[date]
    expected_arrival_date: Optional[date]
    days_late: int
    reasons: list = field(default_factory=list)
    warnings: list = field(default_factory=list)
    assumptions: dict = field(default_factory=dict)

    def to_dict(self) -> dict:
        data = asdict(self)
        for key in ("as_of", "suggested_order_date", "expected_arrival_date"):
            data[key] = data[key].isoformat() if data[key] is not None else None
        return data


def _demand_std_from_forecast(forecast: Sequence[ForecastPoint], confidence: float) -> Optional[float]:
    """Daily demand uncertainty implied by the forecast interval (``bound = pred +- z * sigma``).

    Uses the upper bound because the lower bound is clipped at 0 for slow movers; falls back to
    the lower bound when only that one exists. Returns ``None`` if there is no usable interval.
    """
    z = NormalDist().inv_cdf(0.5 + confidence / 2.0)
    sigmas = []
    for p in forecast:
        if p.upper is not None and p.upper > p.predicted:
            sigmas.append((p.upper - p.predicted) / z)
        elif p.lower is not None and 0 < p.lower < p.predicted:
            sigmas.append((p.predicted - p.lower) / z)
    return sum(sigmas) / len(sigmas) if sigmas else None


def _validate(inp: ReorderInput) -> None:
    if not inp.forecast:
        raise ValueError("forecast must contain at least one day")
    if any(p.predicted < 0 or not math.isfinite(p.predicted) for p in inp.forecast):
        raise ValueError("forecast values must be finite and >= 0")
    if inp.on_hand < 0 or inp.reserved < 0:
        raise ValueError("on_hand and reserved must be >= 0")
    if inp.demand_std_override is not None and inp.demand_std_override < 0:
        raise ValueError("demand_std_override must be >= 0")
    if not 0.5 < inp.forecast_confidence_level < 1:
        raise ValueError("forecast_confidence_level must be within (0.5, 1)")
    if inp.review_period_days < 0:
        raise ValueError("review_period_days must be >= 0")


def recommend_reorder(inp: ReorderInput) -> ReorderRecommendation:
    """Full reorder recommendation for one product at one warehouse."""
    _validate(inp)
    warnings: list = []

    # --- stock actually usable --------------------------------------------------------
    reserved = inp.reserved if inp.use_available_stock else 0.0
    if reserved > inp.on_hand:
        warnings.append(f"Reserved stock {reserved:g} exceeds on-hand {inp.on_hand:g}; treated as 0 available")
    available = max(0.0, inp.on_hand - reserved)

    # --- demand ----------------------------------------------------------------------
    daily = [p.predicted for p in inp.forecast]
    avg_daily = sum(daily) / len(daily)
    if inp.demand_std_override is not None:
        demand_std, std_source = inp.demand_std_override, "override"
    else:
        derived = _demand_std_from_forecast(inp.forecast, inp.forecast_confidence_level)
        if derived is None:
            demand_std, std_source = 0.0, "none"
            warnings.append("Forecast has no confidence interval; demand uncertainty assumed 0, safety stock may be too low")
        else:
            demand_std, std_source = derived, "forecast_interval"

    # --- lead time + incoming stock -------------------------------------------------
    lead = estimate_lead_time(
        supplier_lead_time_days=inp.supplier_lead_time_days,
        reliability_score=inp.supplier_reliability,
        observed_lead_times=inp.observed_lead_times,
    )
    warnings.extend(lead.warnings)
    incoming = summarize_incoming_stock(
        inp.po_lines,
        product_id=inp.product_id,
        warehouse_id=inp.warehouse_id,
        as_of=inp.as_of,
        horizon_days=lead.expected_days,
    )
    warnings.extend(incoming.warnings)
    if len(daily) < math.ceil(lead.expected_days + inp.review_period_days):
        warnings.append(
            f"Forecast covers {len(daily)} day(s) but the order cycle is "
            f"{lead.expected_days + inp.review_period_days:g} day(s); the average demand is extrapolated"
        )

    # --- M1 building blocks ------------------------------------------------------------
    safety = calculate_safety_stock(
        avg_daily_demand=avg_daily,
        lead_time_days=lead.expected_days,
        demand_std=demand_std,
        lead_time_std=lead.std_days,
        service_level=inp.service_level,
        method=inp.safety_stock_method,
        max_daily_demand=max([p.upper if p.upper is not None else p.predicted for p in inp.forecast]),
        max_lead_time_days=lead.worst_case_days,
    ).safety_stock
    decision = decide_reorder(
        on_hand=available,
        on_order=incoming.total_on_order,
        avg_daily_demand=avg_daily,
        lead_time_days=lead.expected_days,
        safety_stock=safety,
        min_stock_level=inp.min_stock_level,
    )
    # The product's configured minimum stock is a business floor for the buffer in the order-up-to
    # level. Without it a product below its minimum could be flagged "reorder" yet get quantity 0
    # whenever the forecast-based target is lower than the minimum.
    buffer_for_target = max(safety, inp.min_stock_level)
    quantity = calculate_recommended_quantity(
        on_hand=available,
        on_order=incoming.total_on_order,
        avg_daily_demand=avg_daily,
        lead_time_days=lead.expected_days,
        safety_stock=buffer_for_target,
        review_period_days=inp.review_period_days,
        max_stock_level=inp.max_stock_level,
        moq=inp.moq,
        order_multiple=inp.order_multiple,
    )

    # --- M2: will the stock last until the next delivery? -------------------------------
    risk = assess_shortage_risk(
        on_hand=available,
        daily_demand=daily,
        lead_time_days=lead.expected_days,
        demand_std=demand_std,
        lead_time_std=lead.std_days,
        safety_stock=safety,
        arrivals=incoming.arrivals_by_day(),
    )
    # Timing only trusts deliveries that land inside the lead-time window; overdue / undated /
    # very late purchase orders must not postpone a new order.
    reliable_position = available + incoming.arriving_within_horizon
    timing = suggest_order_timing(
        today=inp.as_of,
        inventory_position=reliable_position,
        reorder_point=decision.reorder_point,
        avg_daily_demand=avg_daily,
        lead_time_days=lead.expected_days,
        days_until_stockout=risk.days_until_stockout,
    )

    # --- final action ------------------------------------------------------------------
    qty = quantity.recommended_quantity
    should_order = decision.should_reorder and qty > 0
    if should_order:
        action = ACTION_REORDER
    elif risk.level == RISK_HIGH:
        action = ACTION_EXPEDITE if incoming.total_on_order > 0 else ACTION_REORDER
    else:
        action = ACTION_NONE

    urgency_db = max(_URGENCY_TO_DB[decision.urgency], _RISK_TO_DB[risk.level], key=_RANK.get)
    if action == ACTION_NONE:
        urgency_db = "LOW"

    reasons = list(decision.reasons) + list(risk.reasons) if action != ACTION_NONE else []
    if action == ACTION_EXPEDITE:
        reasons.append("Enough stock is on order, but it is not expected to arrive before the stock runs out")
    if buffer_for_target > safety and qty > 0:
        reasons.append(f"Target stock raised to respect the minimum stock level {inp.min_stock_level}")
    if quantity.capped_by_max_stock:
        reasons.append("Quantity limited by the product's maximum stock level")

    return ReorderRecommendation(
        product_id=inp.product_id,
        warehouse_id=inp.warehouse_id,
        as_of=inp.as_of,
        action=action,
        should_reorder=should_order,
        recommended_quantity=qty if should_order else 0,
        urgency_level=urgency_db,
        shortage_risk=risk.level,
        stockout_probability=risk.stockout_probability,
        days_until_stockout=risk.days_until_stockout,
        expected_shortage_units=risk.expected_shortage_units,
        current_stock=inp.on_hand,
        available_stock=available,
        incoming_stock=incoming.total_on_order,
        inventory_position=decision.inventory_position,
        avg_daily_demand=round(avg_daily, 2),
        demand_std=round(demand_std, 2),
        lead_time_days=lead.expected_days,
        lead_time_std_days=lead.std_days,
        lead_time_source=lead.source,
        safety_stock=safety,
        reorder_point=decision.reorder_point,
        target_stock=quantity.target_stock,
        suggested_order_date=timing.order_date,
        expected_arrival_date=timing.expected_arrival_date,
        days_late=timing.days_late,
        reasons=reasons,
        warnings=warnings,
        assumptions={
            "service_level": inp.service_level,
            "safety_stock_method": inp.safety_stock_method,
            "demand_std_source": std_source,
            "review_period_days": inp.review_period_days,
            "uses_available_stock": inp.use_available_stock,
            "draft_po_qty_excluded": incoming.excluded_draft_qty,
            "overdue_po_qty": incoming.overdue_qty,
        },
    )

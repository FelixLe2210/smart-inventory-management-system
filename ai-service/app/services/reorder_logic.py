"""Pure reorder logic (no I/O) for Sprint 9 - M1.

Sprint9-01  Reorder Decision Logic        -> :func:`decide_reorder`
Sprint9-02  Safety Stock Calculation       -> :func:`calculate_safety_stock`
Sprint9-03  Recommended Quantity Calculation -> :func:`calculate_recommended_quantity`

Conventions
-----------
* ``inventory_position = on_hand + on_order`` (stock that will be available).
* ``reorder_point (ROP) = avg_daily_demand * lead_time + safety_stock``.
* Reorder is needed when ``inventory_position <= ROP`` or stock is below the
  product's configured ``min_stock_level``.
"""
from __future__ import annotations

import math
from dataclasses import dataclass
from statistics import NormalDist
from typing import Optional

SAFETY_STOCK_METHODS = ("statistical", "max_min", "fixed_days")

URGENCY_CRITICAL = "CRITICAL"
URGENCY_HIGH = "HIGH"
URGENCY_MEDIUM = "MEDIUM"
URGENCY_NONE = "NONE"


@dataclass(frozen=True)
class SafetyStockResult:
    method: str
    service_level: float
    z_score: float
    safety_stock: int


@dataclass(frozen=True)
class ReorderDecision:
    should_reorder: bool
    urgency: str
    reasons: list
    reorder_point: int
    inventory_position: float
    days_of_cover: Optional[float]


@dataclass(frozen=True)
class QuantityResult:
    target_stock: int
    raw_quantity: int
    recommended_quantity: int
    capped_by_max_stock: bool
    adjusted_for_moq: bool


def z_score_for_service_level(service_level: float) -> float:
    """Z value of the standard normal distribution for a cycle service level."""
    if not 0.5 <= service_level < 1.0:
        raise ValueError("service_level must be in [0.5, 1.0)")
    return NormalDist().inv_cdf(service_level)


def calculate_safety_stock(
    *,
    avg_daily_demand: float,
    lead_time_days: float,
    demand_std: float = 0.0,
    lead_time_std: float = 0.0,
    service_level: float = 0.95,
    method: str = "statistical",
    max_daily_demand: Optional[float] = None,
    max_lead_time_days: Optional[float] = None,
    fixed_days: float = 3.0,
) -> SafetyStockResult:
    """Safety stock by the selected method (always returned as a whole unit >= 0).

    * ``statistical``: ``Z * sqrt(LT * sigma_d^2 + d^2 * sigma_LT^2)``
    * ``max_min``    : ``max_daily * max_LT - avg_daily * avg_LT``
    * ``fixed_days`` : ``avg_daily * fixed_days``
    """
    if method not in SAFETY_STOCK_METHODS:
        raise ValueError(f"method must be one of {SAFETY_STOCK_METHODS}")
    if avg_daily_demand < 0 or lead_time_days < 0 or demand_std < 0 or lead_time_std < 0:
        raise ValueError("demand, lead time and their deviations must be >= 0")

    z = z_score_for_service_level(service_level)

    if method == "statistical":
        variance = lead_time_days * demand_std ** 2 + (avg_daily_demand ** 2) * lead_time_std ** 2
        raw = z * math.sqrt(variance)
    elif method == "max_min":
        max_d = max_daily_demand if max_daily_demand is not None else avg_daily_demand
        max_lt = max_lead_time_days if max_lead_time_days is not None else lead_time_days
        raw = max_d * max_lt - avg_daily_demand * lead_time_days
    else:  # fixed_days
        raw = avg_daily_demand * fixed_days

    return SafetyStockResult(
        method=method,
        service_level=service_level,
        z_score=round(z, 4),
        safety_stock=max(0, math.ceil(raw)),
    )


def calculate_reorder_point(avg_daily_demand: float, lead_time_days: float, safety_stock: int) -> int:
    return math.ceil(avg_daily_demand * lead_time_days + safety_stock)


def decide_reorder(
    *,
    on_hand: float,
    on_order: float,
    avg_daily_demand: float,
    lead_time_days: float,
    safety_stock: int,
    min_stock_level: int = 0,
) -> ReorderDecision:
    """Decide whether a product needs reordering and how urgent it is."""
    reorder_point = calculate_reorder_point(avg_daily_demand, lead_time_days, safety_stock)
    position = on_hand + on_order
    days_of_cover = round(on_hand / avg_daily_demand, 1) if avg_daily_demand > 0 else None

    reasons: list = []
    if position <= reorder_point:
        reasons.append(f"Inventory position {position:g} <= reorder point {reorder_point}")
    if min_stock_level > 0 and on_hand < min_stock_level:
        reasons.append(f"On-hand {on_hand:g} below minimum stock level {min_stock_level}")
    should_reorder = bool(reasons)

    if not should_reorder:
        urgency = URGENCY_NONE
    elif on_hand <= 0:
        urgency = URGENCY_CRITICAL
        reasons.append("Out of stock")
    elif days_of_cover is not None and days_of_cover < lead_time_days:
        urgency = URGENCY_CRITICAL
        reasons.append(
            f"Stock covers {days_of_cover} days, shorter than lead time {lead_time_days:g} days"
        )
    elif on_hand <= safety_stock:
        urgency = URGENCY_HIGH
        reasons.append("On-hand is within safety stock")
    else:
        urgency = URGENCY_MEDIUM

    return ReorderDecision(
        should_reorder=should_reorder,
        urgency=urgency,
        reasons=reasons,
        reorder_point=reorder_point,
        inventory_position=round(position, 2),
        days_of_cover=days_of_cover,
    )


def calculate_recommended_quantity(
    *,
    on_hand: float,
    on_order: float,
    avg_daily_demand: float,
    lead_time_days: float,
    safety_stock: int,
    review_period_days: float = 7.0,
    max_stock_level: Optional[int] = None,
    moq: int = 1,
    order_multiple: int = 1,
) -> QuantityResult:
    """Order-up-to quantity, capped by max stock and rounded to MOQ / pack size.

    ``target_stock = avg_daily_demand * (lead_time + review_period) + safety_stock``
    ``raw_quantity = max(0, target_stock - inventory_position)``
    """
    if moq < 1 or order_multiple < 1:
        raise ValueError("moq and order_multiple must be >= 1")

    target = math.ceil(avg_daily_demand * (lead_time_days + review_period_days) + safety_stock)
    position = on_hand + on_order

    capped = False
    if max_stock_level is not None and target > max_stock_level:
        target = max_stock_level
        capped = True

    raw = max(0, math.ceil(target - position))
    if raw == 0:
        return QuantityResult(target, 0, 0, capped, False)

    qty = max(raw, moq)
    qty = math.ceil(qty / order_multiple) * order_multiple
    adjusted = qty != raw
    # Rounding up for MOQ/pack size may exceed max stock; round down to pack size
    # in that case, but never below one pack.
    if max_stock_level is not None and position + qty > max_stock_level:
        room = max(0, math.floor(max_stock_level - position))
        fitted = (room // order_multiple) * order_multiple
        if fitted >= moq:
            qty = fitted
            capped = True
    return QuantityResult(target, raw, int(qty), capped, adjusted)

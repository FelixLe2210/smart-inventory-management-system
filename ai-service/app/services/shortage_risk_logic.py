"""Sprint9-07 - Shortage Risk Logic (M2). Pure functions, no I/O.

Question answered: *"If I do nothing new today, will I run out of stock before the next
delivery could arrive?"*  A new order placed today only helps after one lead time, so the
risk window is ``[0, lead_time]``. Two complementary views are combined:

1. **Deterministic projection** - walk day by day with the forecast demand and the dated
   incoming deliveries. It gives ``days_until_stockout`` and ``projected_min_stock``
   (easy to explain and to show on a chart).
2. **Probabilistic estimate** - demand during the window is normally distributed with
   ``mu = sum(forecast)`` and
   ``sigma = sqrt(LT * sigma_d^2 + d^2 * sigma_LT^2)`` (the same variance model as the
   statistical safety stock in ``reorder_logic``), so
   ``P(stock-out) = P(D > S) = 1 - Phi((S - mu) / sigma)`` where ``S`` = on-hand plus the
   deliveries that arrive inside the window. The expected shortage uses the normal loss
   function ``sigma * (phi(z) - z * (1 - Phi(z)))``.

Risk levels
-----------
``HIGH``   projection shows a stock-out inside the window, or ``P >= high_probability`` (0.50)
``MEDIUM`` ``P >= medium_probability`` (0.10), or stock is projected to dip below safety stock
``LOW``    otherwise

With a safety stock sized for a 95% service level the stock-out probability of a healthy item
is <= 5%, so it is classified ``LOW`` - the two AI #2 components stay consistent.
"""
from __future__ import annotations

import math
from dataclasses import dataclass, field
from statistics import NormalDist
from typing import List, Optional, Sequence, Tuple, Union

RISK_LOW = "LOW"
RISK_MEDIUM = "MEDIUM"
RISK_HIGH = "HIGH"
RISK_LEVELS = (RISK_LOW, RISK_MEDIUM, RISK_HIGH)

DEFAULT_HIGH_PROBABILITY = 0.50
DEFAULT_MEDIUM_PROBABILITY = 0.10

_N = NormalDist()


@dataclass(frozen=True)
class ShortageRisk:
    level: str
    stockout_probability: float
    days_until_stockout: Optional[int]  # first day (1 = tomorrow) with unmet demand; None = none in window
    projected_min_stock: float
    expected_shortage_units: float
    window_days: int
    available_by_window_end: float  # on-hand + deliveries inside the window (S)
    demand_in_window: float  # expected demand inside the window (mu)
    reasons: list = field(default_factory=list)


def _daily_series(daily_demand: Union[float, Sequence[float]], days: int) -> List[float]:
    """Demand for each of the next ``days`` days; a short forecast is padded with its mean."""
    if isinstance(daily_demand, (int, float)):
        values = [float(daily_demand)]
    else:
        values = [float(v) for v in daily_demand]
    if not values:
        raise ValueError("daily_demand must not be empty")
    if any(v < 0 or not math.isfinite(v) for v in values):
        raise ValueError("daily_demand values must be finite and >= 0")
    if len(values) >= days:
        return values[:days]
    pad = sum(values) / len(values)
    return values + [pad] * (days - len(values))


def normal_loss(z: float) -> float:
    """Standard normal loss function ``L(z) = phi(z) - z * (1 - Phi(z))`` (expected shortage per sigma)."""
    return _N.pdf(z) - z * (1.0 - _N.cdf(z))


def assess_shortage_risk(
    *,
    on_hand: float,
    daily_demand: Union[float, Sequence[float]],
    lead_time_days: float,
    demand_std: float = 0.0,
    lead_time_std: float = 0.0,
    safety_stock: float = 0.0,
    arrivals: Sequence[Tuple[int, float]] = (),
    high_probability: float = DEFAULT_HIGH_PROBABILITY,
    medium_probability: float = DEFAULT_MEDIUM_PROBABILITY,
) -> ShortageRisk:
    """Classify the stock-out risk before the next possible delivery.

    ``arrivals`` are ``(day_offset, quantity)`` pairs of already ordered goods, available at
    the *start* of ``day_offset`` (1 = tomorrow, 0 = today). Deliveries after the window do
    not protect against a stock-out inside it and are ignored here.
    """
    if on_hand < 0 or lead_time_days < 0 or demand_std < 0 or lead_time_std < 0 or safety_stock < 0:
        raise ValueError("on_hand, lead_time_days, demand_std, lead_time_std, safety_stock must be >= 0")
    if not 0 < medium_probability < high_probability <= 1:
        raise ValueError("require 0 < medium_probability < high_probability <= 1")
    for day, qty in arrivals:
        if day < 0 or qty < 0:
            raise ValueError("arrivals must have day_offset >= 0 and quantity >= 0")

    window = max(1, math.ceil(lead_time_days))
    daily = _daily_series(daily_demand, window)
    # a fractional lead time only exposes the stock to part of the last day
    weights = [1.0] * window
    frac = lead_time_days - (window - 1)
    if lead_time_days <= 0:
        weights[-1] = 0.0  # instant delivery: nothing is exposed
    elif 0 < frac < 1:
        weights[-1] = frac
    exposed = [d * w for d, w in zip(daily, weights)]

    # 1) deterministic day-by-day projection
    arrivals_by_day = {}
    for day, qty in arrivals:
        arrivals_by_day[day] = arrivals_by_day.get(day, 0.0) + qty
    stock = float(on_hand) + arrivals_by_day.get(0, 0.0)
    min_stock, stockout_day = stock, None
    for day in range(1, window + 1):
        stock += arrivals_by_day.get(day, 0.0)
        stock -= exposed[day - 1]
        min_stock = min(min_stock, stock)
        if stockout_day is None and stock < -1e-9:
            stockout_day = day

    # 2) probabilistic view over the whole window
    mu = sum(exposed)
    supply = float(on_hand) + sum(q for d, q in arrivals if d <= window)
    mean_daily = mu / lead_time_days if lead_time_days > 0 else 0.0
    variance = lead_time_days * demand_std ** 2 + (mean_daily ** 2) * lead_time_std ** 2
    sigma = math.sqrt(variance)
    if sigma > 0:
        z = (supply - mu) / sigma
        probability = 1.0 - _N.cdf(z)
        shortage = sigma * normal_loss(z)
    else:
        probability = 1.0 if supply < mu - 1e-9 else 0.0
        shortage = max(0.0, mu - supply)

    reasons: list = []
    if stockout_day is not None:
        level = RISK_HIGH
        reasons.append(f"Projected stock-out on day {stockout_day}, within the {window}-day lead time")
    elif probability >= high_probability:
        level = RISK_HIGH
        reasons.append(f"Stock-out probability {probability:.0%} >= {high_probability:.0%}")
    elif probability >= medium_probability:
        level = RISK_MEDIUM
        reasons.append(f"Stock-out probability {probability:.0%} >= {medium_probability:.0%}")
    elif min_stock < safety_stock:
        level = RISK_MEDIUM
        reasons.append(f"Projected stock {min_stock:g} drops below safety stock {safety_stock:g}")
    else:
        level = RISK_LOW

    return ShortageRisk(
        level=level,
        stockout_probability=round(probability, 4),
        days_until_stockout=stockout_day,
        projected_min_stock=round(min_stock, 2),
        expected_shortage_units=round(shortage, 2),
        window_days=window,
        available_by_window_end=round(supply, 2),
        demand_in_window=round(mu, 2),
        reasons=reasons,
    )

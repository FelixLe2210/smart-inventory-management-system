"""Sprint9-05 - Lead Time Logic (M2). Pure functions, no I/O.

Lead time is the number of days between placing a purchase order and having the goods
in the warehouse. It drives three decisions of the reorder AI:

* how much demand must be covered while waiting      -> :func:`lead_time_demand`
* how much safety stock is needed (lead-time *variability* is a risk) -> ``lead_time_std``
* when the order has to be placed to avoid a stock-out -> :func:`suggest_order_timing`

Where the numbers come from (in order of preference)
----------------------------------------------------
1. ``observed``          - real history (``actual_delivery_date - order_date`` of past POs),
                           used when at least ``min_samples`` valid values exist.
2. ``supplier_default``  - ``suppliers.lead_time_days``; the spread is estimated from
                           ``suppliers.reliability_score`` (1.00 = always on time):
                           ``std = lead_time * (1 - reliability) * variability_factor``.
3. ``default``           - nothing known: ``default_lead_time_days`` and a warning.
"""
from __future__ import annotations

import math
from dataclasses import dataclass, field
from datetime import date, timedelta
from statistics import mean, stdev
from typing import Optional, Sequence

SOURCE_OBSERVED = "observed"
SOURCE_SUPPLIER = "supplier_default"
SOURCE_DEFAULT = "default"

WORST_CASE_SIGMAS = 2.0  # worst case = expected + 2 sigma (~97.7% of deliveries are earlier)


@dataclass(frozen=True)
class LeadTimeResult:
    expected_days: float
    std_days: float
    worst_case_days: float
    source: str
    samples: int
    warnings: list = field(default_factory=list)


@dataclass(frozen=True)
class OrderTiming:
    """When to order and when the goods are expected (calendar dates)."""

    order_date: Optional[date]
    expected_arrival_date: Optional[date]
    days_until_order: Optional[int]
    days_late: int  # >0: even an order placed on ``order_date`` arrives after the projected stock-out


def _is_valid_duration(value) -> bool:
    return isinstance(value, (int, float)) and math.isfinite(value) and value >= 0


def estimate_lead_time(
    *,
    supplier_lead_time_days: Optional[float] = None,
    reliability_score: Optional[float] = None,
    observed_lead_times: Optional[Sequence[float]] = None,
    min_samples: int = 3,
    processing_days: float = 0.0,
    variability_factor: float = 0.5,
    default_lead_time_days: float = 7.0,
) -> LeadTimeResult:
    """Expected lead time, its standard deviation and a worst case, in days.

    ``processing_days`` is internal time before the supplier starts (approval, sending the
    PO); it is added to the expected value and does not change the spread.
    """
    if processing_days < 0 or variability_factor < 0 or default_lead_time_days < 0 or min_samples < 2:
        raise ValueError("processing_days, variability_factor, default_lead_time_days must be >= 0 and min_samples >= 2")
    if supplier_lead_time_days is not None and not _is_valid_duration(supplier_lead_time_days):
        raise ValueError("supplier_lead_time_days must be a finite number >= 0")
    if reliability_score is not None and not (
        isinstance(reliability_score, (int, float)) and math.isfinite(reliability_score) and 0 <= reliability_score <= 1
    ):
        raise ValueError("reliability_score must be within [0, 1]")

    warnings: list = []
    valid = [float(v) for v in (observed_lead_times or []) if _is_valid_duration(v)]
    ignored = len(observed_lead_times or []) - len(valid)
    if ignored:
        warnings.append(f"Ignored {ignored} invalid observed lead time value(s)")

    if len(valid) >= min_samples:
        expected, std, source, samples = mean(valid), stdev(valid), SOURCE_OBSERVED, len(valid)
    else:
        if valid:
            warnings.append(f"Only {len(valid)} observed lead time(s); at least {min_samples} are needed to use history")
        samples = len(valid)
        if supplier_lead_time_days is not None:
            base, source = float(supplier_lead_time_days), SOURCE_SUPPLIER
        else:
            base, source = float(default_lead_time_days), SOURCE_DEFAULT
            warnings.append(f"Supplier lead time unknown; assumed {default_lead_time_days:g} days")
        if reliability_score is None:
            warnings.append("Supplier reliability unknown; no lead time variability assumed")
            reliability_score = 1.0
        expected = base
        std = base * (1.0 - reliability_score) * variability_factor

    expected += processing_days
    return LeadTimeResult(
        expected_days=round(expected, 2),
        std_days=round(std, 2),
        worst_case_days=round(expected + WORST_CASE_SIGMAS * std, 2),
        source=source,
        samples=samples,
        warnings=warnings,
    )


def lead_time_demand(avg_daily_demand: float, lead_time_days: float) -> float:
    """Expected units sold while waiting for the delivery."""
    if avg_daily_demand < 0 or lead_time_days < 0:
        raise ValueError("avg_daily_demand and lead_time_days must be >= 0")
    return avg_daily_demand * lead_time_days


def expected_arrival_date(order_date: date, lead_time_days: float) -> date:
    """Arrival date of an order placed on ``order_date`` (fractions of a day round up)."""
    if lead_time_days < 0:
        raise ValueError("lead_time_days must be >= 0")
    return order_date + timedelta(days=math.ceil(lead_time_days))


def suggest_order_timing(
    *,
    today: date,
    inventory_position: float,
    reorder_point: float,
    avg_daily_demand: float,
    lead_time_days: float,
    days_until_stockout: Optional[float] = None,
) -> OrderTiming:
    """Date by which the order must be placed.

    * Position already at/below the reorder point -> order **today**.
    * Otherwise the order can wait until the position is expected to *reach* the reorder
      point: ``floor((position - ROP) / avg_daily_demand)`` days.
    * With no demand and a position above the ROP there is nothing to schedule (``None``).

    ``days_late`` compares the arrival with ``days_until_stockout`` (from the shortage-risk
    projection): when positive, the supplier cannot deliver in time and the user should
    expedite or find stock elsewhere.
    """
    if avg_daily_demand < 0 or lead_time_days < 0:
        raise ValueError("avg_daily_demand and lead_time_days must be >= 0")

    if inventory_position <= reorder_point:
        wait = 0
    elif avg_daily_demand <= 0:
        return OrderTiming(None, None, None, 0)
    else:
        wait = max(0, math.floor((inventory_position - reorder_point) / avg_daily_demand))

    order_day = today + timedelta(days=wait)
    arrival = expected_arrival_date(order_day, lead_time_days)
    days_late = 0
    if days_until_stockout is not None:
        days_late = max(0, (arrival - today).days - math.floor(days_until_stockout))
    return OrderTiming(order_day, arrival, wait, days_late)

"""Incoming stock logic. Pure functions, no I/O.

"Incoming stock" (``on_order``) is the quantity already ordered from suppliers but not yet
received. The reorder AI needs it twice:

* in the *inventory position* (``on_hand + on_order``) so we do not order the same goods
  again - the main protection against double ordering;
* with its *arrival dates*, so the shortage-risk logic can tell whether the goods land
  before the stock runs out.

Counting rules (``purchase_orders.status``)
-------------------------------------------
============================  ======================================================
``SENT``, ``PARTIALLY_RECEIVED``  counted: ``outstanding = max(0, ordered - received)``
``DRAFT``                         NOT counted (not committed to the supplier); reported
                                  as ``excluded_draft_qty`` so the UI can show it
``RECEIVED``, ``CANCELLED``       never counted
============================  ======================================================

Conservative treatment of uncertain dates: an overdue PO (expected date already passed) or a
PO without an expected date is part of ``total_on_order`` but is **not** treated as arriving
within the horizon, because we cannot rely on it being there in time.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date
from typing import Iterable, List, Optional, Tuple

STATUS_SENT = "SENT"
STATUS_PARTIAL = "PARTIALLY_RECEIVED"
STATUS_DRAFT = "DRAFT"
STATUS_RECEIVED = "RECEIVED"
STATUS_CANCELLED = "CANCELLED"

COUNTED_STATUSES = (STATUS_SENT, STATUS_PARTIAL)
KNOWN_STATUSES = (STATUS_DRAFT, STATUS_SENT, STATUS_PARTIAL, STATUS_RECEIVED, STATUS_CANCELLED)


@dataclass(frozen=True)
class PurchaseOrderLine:
    """One product line of a purchase order, flattened with the PO header fields we need."""

    po_id: int
    product_id: int
    warehouse_id: int  # purchase_orders.destination_warehouse_id
    status: str
    ordered_qty: int
    received_qty: int = 0
    expected_delivery_date: Optional[date] = None
    po_number: Optional[str] = None


@dataclass(frozen=True)
class IncomingArrival:
    po_id: int
    po_number: Optional[str]
    quantity: int
    expected_date: Optional[date]
    days_from_now: Optional[int]  # None when the PO has no expected date
    overdue: bool


@dataclass(frozen=True)
class IncomingStockSummary:
    total_on_order: int
    arriving_within_horizon: int
    overdue_qty: int
    undated_qty: int
    excluded_draft_qty: int
    arrivals: Tuple[IncomingArrival, ...] = ()
    warnings: list = field(default_factory=list)

    def arrivals_by_day(self) -> List[Tuple[int, int]]:
        """``[(days_from_now, qty), ...]`` for dated, not-overdue arrivals; feeds the risk projection."""
        return sorted(
            (a.days_from_now, a.quantity)
            for a in self.arrivals
            if a.days_from_now is not None and not a.overdue
        )


def summarize_incoming_stock(
    lines: Iterable[PurchaseOrderLine],
    *,
    product_id: int,
    warehouse_id: int,
    as_of: date,
    horizon_days: Optional[float] = None,
    include_draft: bool = False,
    include_overdue: bool = True,
    include_undated: bool = True,
) -> IncomingStockSummary:
    """Aggregate open purchase-order quantity for one product at one warehouse.

    ``horizon_days`` is normally the expected lead time: ``arriving_within_horizon`` is what
    will be physically available before a *new* order could arrive.
    """
    total = within = overdue_qty = undated_qty = draft_qty = 0
    arrivals: List[IncomingArrival] = []
    warnings: list = []

    for line in lines:
        if line.product_id != product_id or line.warehouse_id != warehouse_id:
            continue
        if line.ordered_qty < 0 or line.received_qty < 0:
            raise ValueError(f"PO {line.po_id}: ordered/received quantity must be >= 0")

        status = (line.status or "").upper()
        if status not in KNOWN_STATUSES:
            warnings.append(f"PO {line.po_id}: unknown status '{line.status}' ignored")
            continue

        outstanding = max(0, line.ordered_qty - line.received_qty)
        if line.received_qty > line.ordered_qty:
            warnings.append(f"PO {line.po_id}: received quantity exceeds ordered quantity")

        if status in (STATUS_RECEIVED, STATUS_CANCELLED) or outstanding == 0:
            continue
        if status == STATUS_DRAFT and not include_draft:
            draft_qty += outstanding
            continue

        expected = line.expected_delivery_date
        days = (expected - as_of).days if expected is not None else None
        is_overdue = days is not None and days < 0

        if is_overdue:
            overdue_qty += outstanding
            if not include_overdue:
                continue
        elif days is None:
            undated_qty += outstanding
            if not include_undated:
                continue
        elif horizon_days is None or days <= horizon_days:
            within += outstanding

        total += outstanding
        arrivals.append(IncomingArrival(line.po_id, line.po_number, outstanding, expected, days, is_overdue))

    if overdue_qty:
        warnings.append(f"{overdue_qty} unit(s) on overdue purchase orders are not assumed to arrive in time")
    if undated_qty:
        warnings.append(f"{undated_qty} unit(s) on purchase orders without expected delivery date")

    return IncomingStockSummary(
        total_on_order=total,
        arriving_within_horizon=within,
        overdue_qty=overdue_qty,
        undated_qty=undated_qty,
        excluded_draft_qty=draft_qty,
        arrivals=tuple(arrivals),
        warnings=warnings,
    )

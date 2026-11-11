"""Incoming Stock Logic."""
from datetime import date

import pytest

from app.services.incoming_stock_logic import PurchaseOrderLine as L, summarize_incoming_stock

TODAY = date(2026, 11, 5)
KW = dict(product_id=1, warehouse_id=1, as_of=TODAY)


def line(po, status, ordered, received=0, due=date(2026, 11, 9), product=1, wh=1):
    return L(po, product, wh, status, ordered, received, due, f"PO-{po}")


def test_sent_and_partial_orders_are_counted_with_remaining_quantity():
    s = summarize_incoming_stock(
        [line(1, "SENT", 100), line(2, "PARTIALLY_RECEIVED", 80, received=30)], horizon_days=7, **KW
    )
    assert s.total_on_order == 150  # 100 + (80 - 30)
    assert s.arriving_within_horizon == 150


def test_draft_cancelled_and_received_are_not_counted():
    s = summarize_incoming_stock(
        [line(1, "DRAFT", 50), line(2, "CANCELLED", 70), line(3, "RECEIVED", 90, received=90)], **KW
    )
    assert s.total_on_order == 0
    assert s.excluded_draft_qty == 50


def test_draft_can_be_included_on_request():
    s = summarize_incoming_stock([line(1, "DRAFT", 50)], include_draft=True, **KW)
    assert s.total_on_order == 50 and s.excluded_draft_qty == 0


def test_other_products_and_warehouses_are_ignored():
    s = summarize_incoming_stock(
        [line(1, "SENT", 100, product=2), line(2, "SENT", 100, wh=2), line(3, "SENT", 10)], **KW
    )
    assert s.total_on_order == 10


def test_delivery_after_horizon_counts_as_on_order_but_not_within_horizon():
    s = summarize_incoming_stock([line(1, "SENT", 100, due=date(2026, 11, 20))], horizon_days=7, **KW)
    assert s.total_on_order == 100 and s.arriving_within_horizon == 0
    assert s.arrivals_by_day() == [(15, 100)]


def test_overdue_order_is_counted_but_flagged_and_not_trusted():
    s = summarize_incoming_stock([line(1, "SENT", 100, due=date(2026, 11, 1))], horizon_days=7, **KW)
    assert s.total_on_order == 100
    assert s.overdue_qty == 100 and s.arriving_within_horizon == 0
    assert s.arrivals_by_day() == []
    assert any("overdue" in w for w in s.warnings)


def test_overdue_order_can_be_excluded():
    s = summarize_incoming_stock([line(1, "SENT", 100, due=date(2026, 11, 1))], include_overdue=False, **KW)
    assert s.total_on_order == 0


def test_order_without_expected_date_is_flagged():
    s = summarize_incoming_stock([line(1, "SENT", 40, due=None)], horizon_days=7, **KW)
    assert s.total_on_order == 40 and s.undated_qty == 40 and s.arriving_within_horizon == 0


def test_due_today_counts_as_arriving():
    s = summarize_incoming_stock([line(1, "SENT", 25, due=TODAY)], horizon_days=7, **KW)
    assert s.arriving_within_horizon == 25 and s.arrivals_by_day() == [(0, 25)]


def test_over_received_line_contributes_nothing_and_warns():
    s = summarize_incoming_stock([line(1, "SENT", 10, received=12)], **KW)
    assert s.total_on_order == 0
    assert any("exceeds" in w for w in s.warnings)


def test_unknown_status_is_ignored_with_warning():
    s = summarize_incoming_stock([line(1, "WEIRD", 10)], **KW)
    assert s.total_on_order == 0 and any("unknown status" in w for w in s.warnings)


def test_status_is_case_insensitive():
    assert summarize_incoming_stock([line(1, "sent", 10)], **KW).total_on_order == 10


def test_negative_quantity_is_rejected():
    with pytest.raises(ValueError):
        summarize_incoming_stock([line(1, "SENT", -5)], **KW)


def test_arrivals_by_day_is_sorted():
    s = summarize_incoming_stock(
        [line(1, "SENT", 5, due=date(2026, 11, 12)), line(2, "SENT", 7, due=date(2026, 11, 7))], **KW
    )
    assert [d for d, _ in s.arrivals_by_day()] == [2, 7]

package com.smartinventory.service;

import com.smartinventory.model.InventoryTransaction;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class DemandHistoryBuilderTest {

    private static final LocalDate TODAY = LocalDate.parse("2026-11-06");

    private static InventoryTransaction issue(String dateTime, int qty) {
        InventoryTransaction t = mock(InventoryTransaction.class);
        when(t.getCreatedAt()).thenReturn(LocalDateTime.parse(dateTime));
        when(t.getQuantity()).thenReturn(qty);
        return t;
    }

    @Test
    void noIssuesGivesNull() {
        assertNull(DemandHistoryBuilder.dailySeries(List.of(), TODAY, 120));
        assertNull(DemandHistoryBuilder.dailySeries(null, TODAY, 120));
    }

    @Test
    void onlyTodayGivesNull() {
        assertNull(DemandHistoryBuilder.dailySeries(List.of(issue("2026-11-06T09:00:00", 5)), TODAY, 120));
    }

    @Test
    void sumsPerDayAndZeroFillsGapsUpToYesterday() {
        var rows = DemandHistoryBuilder.dailySeries(List.of(
                issue("2026-11-01T09:00:00", 3),
                issue("2026-11-01T15:00:00", 2),
                issue("2026-11-04T10:00:00", 4),
                issue("2026-11-06T08:00:00", 9)), TODAY, 120);

        assertEquals(5, rows.size()); // Nov 1..5
        assertEquals(Map.of("date", "2026-11-01", "quantity", 5), rows.get(0));
        assertEquals(0, rows.get(1).get("quantity"));
        assertEquals(4, rows.get(3).get("quantity"));
        assertEquals(0, rows.get(4).get("quantity"));
        assertEquals("2026-11-05", rows.get(4).get("date"));
    }

    @Test
    void capsHistoryAtMaxDays() {
        var rows = DemandHistoryBuilder.dailySeries(List.of(issue("2025-01-01T09:00:00", 1)), TODAY, 30);
        assertEquals(30, rows.size());
        assertEquals("2026-10-07", rows.get(0).get("date"));
    }
}

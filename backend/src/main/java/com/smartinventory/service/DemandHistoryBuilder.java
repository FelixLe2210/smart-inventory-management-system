package com.smartinventory.service;

import com.smartinventory.model.InventoryTransaction;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

/** Turns ISSUING transactions into a gap-free daily demand series for the AI service. */
final class DemandHistoryBuilder {

    private DemandHistoryBuilder() {
    }

    /**
     * One row per calendar day from the first sale (at most {@code maxDays} back) up to yesterday;
     * days without sales are 0 so the model does not think the product sells every day.
     * Today is excluded because it is incomplete. Returns null when there is no usable history.
     */
    static List<Map<String, Object>> dailySeries(List<InventoryTransaction> issues, LocalDate today, int maxDays) {
        if (issues == null || issues.isEmpty()) {
            return null;
        }
        TreeMap<LocalDate, Integer> perDay = new TreeMap<>();
        for (InventoryTransaction t : issues) {
            LocalDate day = t.getCreatedAt().toLocalDate();
            if (day.isBefore(today)) {
                perDay.merge(day, t.getQuantity(), Integer::sum);
            }
        }
        if (perDay.isEmpty()) {
            return null;
        }
        LocalDate earliest = today.minusDays(maxDays);
        LocalDate start = perDay.firstKey().isBefore(earliest) ? earliest : perDay.firstKey();
        List<Map<String, Object>> rows = new java.util.ArrayList<>();
        for (LocalDate d = start; d.isBefore(today); d = d.plusDays(1)) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("date", d.toString());
            row.put("quantity", perDay.getOrDefault(d, 0));
            rows.add(row);
        }
        return rows;
    }
}

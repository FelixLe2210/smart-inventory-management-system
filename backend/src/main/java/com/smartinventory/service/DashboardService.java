package com.smartinventory.service;

import com.smartinventory.dto.DashboardKpiResponse;
import com.smartinventory.dto.InventoryReportResponse;
import com.smartinventory.dto.StockAlertResponse;
import com.smartinventory.dto.TransactionReportResponse;
import com.smartinventory.exception.BadRequestException;
import com.smartinventory.model.Inventory;
import com.smartinventory.model.InventoryTransaction;
import com.smartinventory.model.Product;
import com.smartinventory.model.Warehouse;
import com.smartinventory.repository.InventoryRepository;
import com.smartinventory.repository.InventoryTransactionRepository;
import com.smartinventory.repository.ProductRepository;
import com.smartinventory.repository.WarehouseRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.TreeMap;

@Service
@Transactional(readOnly = true)
public class DashboardService {

    private static final Set<String> ALERT_TYPES = Set.of("LOW_STOCK", "OUT_OF_STOCK");
    private static final Set<String> INVENTORY_STATUSES =
            Set.of("IN_STOCK", "LOW_STOCK", "OUT_OF_STOCK", "OVER_STOCK");
    private static final Map<String, String> TRANSACTION_LABELS = Map.of(
            "RECEIVING", "Nhập kho",
            "ISSUING", "Xuất kho",
            "TRANSFER_IN", "Chuyển đến",
            "TRANSFER_OUT", "Chuyển đi",
            "ADJUSTMENT", "Điều chỉnh kiểm kê");

    private final ProductRepository productRepository;
    private final InventoryRepository inventoryRepository;
    private final InventoryTransactionRepository transactionRepository;
    private final WarehouseRepository warehouseRepository;

    public DashboardService(
            ProductRepository productRepository,
            InventoryRepository inventoryRepository,
            InventoryTransactionRepository transactionRepository,
            WarehouseRepository warehouseRepository
    ) {
        this.productRepository = productRepository;
        this.inventoryRepository = inventoryRepository;
        this.transactionRepository = transactionRepository;
        this.warehouseRepository = warehouseRepository;
    }

    public List<StockAlertResponse> getStockAlerts(String type) {
        validateChoice(type, ALERT_TYPES, "type");
        List<Product> products = productRepository.findAllWithCategory();
        List<Inventory> inventories = inventoryRepository.findAllWithReportDetails();
        return buildAlerts(products, inventories).stream()
                .filter(alert -> type == null || type.equals(alert.type()))
                .toList();
    }

    public DashboardKpiResponse getKpis() {
        List<Product> products = productRepository.findAllWithCategory();
        List<Inventory> inventories = inventoryRepository.findAllWithReportDetails();
        List<Warehouse> warehouses = warehouseRepository.findAll();

        long totalStock = 0;
        long totalReserved = 0;
        long totalAvailable = 0;
        BigDecimal totalValue = BigDecimal.ZERO;
        for (Inventory inventory : inventories) {
            long current = zero(inventory.getCurrentStock());
            long reserved = zero(inventory.getReservedStock());
            totalStock += current;
            totalReserved += reserved;
            totalAvailable += inventory.getAvailableStock();
            totalValue = totalValue.add(priceOf(inventory.getProduct()).multiply(BigDecimal.valueOf(current)));
        }

        List<StockAlertResponse> alerts = buildAlerts(products, inventories);
        long lowStockCount = alerts.stream().filter(a -> "LOW_STOCK".equals(a.type())).count();
        long outOfStockCount = alerts.stream().filter(a -> "OUT_OF_STOCK".equals(a.type())).count();
        long activeWarehouses = warehouses.stream().filter(w -> "ACTIVE".equals(w.getStatus())).count();

        return new DashboardKpiResponse(products.size(), totalStock, totalReserved, totalAvailable, totalValue,
                lowStockCount, outOfStockCount, warehouses.size(), activeWarehouses);
    }

    public InventoryReportResponse getInventoryReport(Long warehouseId, Long categoryId, String status) {
        validateChoice(status, INVENTORY_STATUSES, "status");
        List<InventoryReportResponse.Row> rows = inventoryRepository.findAllWithReportDetails().stream()
                .filter(i -> warehouseId == null || Objects.equals(i.getWarehouse().getId(), warehouseId))
                .filter(i -> categoryId == null || Objects.equals(i.getProduct().getCategory().getId(), categoryId))
                .map(this::toInventoryRow)
                .filter(row -> status == null || status.equals(row.status()))
                .toList();

        long totalQuantity = 0;
        long totalReserved = 0;
        long totalAvailable = 0;
        long lowStock = 0;
        long outOfStock = 0;
        long overStock = 0;
        BigDecimal totalValue = BigDecimal.ZERO;
        for (InventoryReportResponse.Row row : rows) {
            totalQuantity += zero(row.currentStock());
            totalReserved += zero(row.reservedStock());
            totalAvailable += zero(row.availableStock());
            totalValue = totalValue.add(row.stockValue());
            if ("LOW_STOCK".equals(row.status())) lowStock++;
            if ("OUT_OF_STOCK".equals(row.status())) outOfStock++;
            if ("OVER_STOCK".equals(row.status())) overStock++;
        }
        var summary = new InventoryReportResponse.Summary(rows.size(), totalQuantity, totalReserved, totalAvailable,
                totalValue, lowStock, outOfStock, overStock);
        return new InventoryReportResponse(summary, rows);
    }

    public TransactionReportResponse getTransactionReport(
            LocalDate from, LocalDate to, String type, Long warehouseId, Long productId
    ) {
        if (from != null && to != null && from.isAfter(to)) {
            throw new BadRequestException("INVALID_DATE_RANGE", "'from' must be on or before 'to'.");
        }
        if (type != null && !TRANSACTION_LABELS.containsKey(type)) {
            throw new BadRequestException("INVALID_TYPE", "Parameter 'type' is not a supported transaction type.");
        }

        LocalDateTime fromInclusive = from == null ? null : from.atStartOfDay();
        LocalDateTime toExclusive = to == null ? null : to.plusDays(1).atStartOfDay();
        List<InventoryTransaction> transactions = transactionRepository.findForReport(
                fromInclusive, toExclusive, type, warehouseId, productId);

        Map<String, MutableTypeSummary> byType = new TreeMap<>();
        long received = 0;
        long issued = 0;
        long transferred = 0;
        long adjustments = 0;
        long netChange = 0;
        for (InventoryTransaction transaction : transactions) {
            String transactionType = transaction.getTransactionType();
            long quantity = zero(transaction.getQuantity());
            byType.computeIfAbsent(transactionType,
                    key -> new MutableTypeSummary(key, TRANSACTION_LABELS.get(key))).add(quantity);
            switch (transactionType) {
                case "RECEIVING" -> {
                    received += quantity;
                    netChange += quantity;
                }
                case "ISSUING" -> {
                    issued += quantity;
                    netChange -= quantity;
                }
                case "TRANSFER_OUT" -> {
                    transferred += quantity;
                    if (warehouseId != null) netChange -= quantity;
                }
                case "TRANSFER_IN" -> {
                    if (warehouseId != null) netChange += quantity;
                }
                case "ADJUSTMENT" -> {
                    adjustments++;
                    netChange += (long) zero(transaction.getBalanceAfter()) - zero(transaction.getBalanceBefore());
                }
                default -> { }
            }
        }

        List<TransactionReportResponse.Row> rows = transactions.stream().map(this::toTransactionRow).toList();
        List<TransactionReportResponse.TypeSummary> typeSummaries = byType.values().stream()
                .map(MutableTypeSummary::toResponse).toList();
        var summary = new TransactionReportResponse.Summary(
                transactions.size(), received, issued, transferred, adjustments, netChange);
        return new TransactionReportResponse(summary, typeSummaries, rows);
    }

    private List<StockAlertResponse> buildAlerts(List<Product> products, List<Inventory> inventories) {
        Map<Long, List<Inventory>> byProduct = new HashMap<>();
        for (Inventory inventory : inventories) {
            byProduct.computeIfAbsent(inventory.getProduct().getId(), ignored -> new ArrayList<>()).add(inventory);
        }

        List<StockAlertResponse> alerts = new ArrayList<>();
        for (Product product : products) {
            if (!"ACTIVE".equals(product.getStatus())) continue;
            List<Inventory> productInventories = byProduct.getOrDefault(product.getId(), List.of());
            long available = productInventories.stream().mapToLong(Inventory::getAvailableStock).sum();
            int minimum = zero(product.getMinStockLevel());
            String type = available <= 0 ? "OUT_OF_STOCK"
                    : minimum > 0 && available <= minimum ? "LOW_STOCK" : null;
            if (type == null) continue;

            List<StockAlertResponse.WarehouseAvailability> allocations = productInventories.stream()
                    .sorted(Comparator.comparing(i -> i.getWarehouse().getCode()))
                    .map(i -> new StockAlertResponse.WarehouseAvailability(
                            i.getWarehouse().getId(), i.getWarehouse().getCode(), i.getWarehouse().getName(),
                            i.getAvailableStock()))
                    .toList();
            alerts.add(new StockAlertResponse(product.getId(), product.getSku(), product.getName(), type,
                    available, minimum, Math.max(0L, minimum - available), allocations));
        }
        alerts.sort(Comparator
                .comparing((StockAlertResponse alert) -> !"OUT_OF_STOCK".equals(alert.type()))
                .thenComparing(StockAlertResponse::shortage, Comparator.reverseOrder())
                .thenComparing(StockAlertResponse::productName, String.CASE_INSENSITIVE_ORDER));
        return alerts;
    }

    private InventoryReportResponse.Row toInventoryRow(Inventory inventory) {
        Product product = inventory.getProduct();
        Warehouse warehouse = inventory.getWarehouse();
        BigDecimal unitCost = priceOf(product);
        long currentStock = zero(inventory.getCurrentStock());
        return new InventoryReportResponse.Row(
                inventory.getId(), product.getId(), product.getSku(), product.getName(),
                product.getCategory().getName(), warehouse.getId(), warehouse.getCode(), warehouse.getName(),
                inventory.getCurrentStock(), inventory.getReservedStock(), inventory.getAvailableStock(),
                product.getMinStockLevel(), product.getMaxStockLevel(), unitCost,
                unitCost.multiply(BigDecimal.valueOf(currentStock)), inventory.getStockStatus());
    }

    private TransactionReportResponse.Row toTransactionRow(InventoryTransaction transaction) {
        return new TransactionReportResponse.Row(
                transaction.getId(), transaction.getTransactionCode(), transaction.getTransactionNo(),
                transaction.getLineNo(), transaction.getTransactionType(), transaction.getProduct().getId(),
                transaction.getSourceWarehouse() == null ? null : transaction.getSourceWarehouse().getId(),
                transaction.getDestinationWarehouse() == null ? null : transaction.getDestinationWarehouse().getId(),
                transaction.getQuantity(), transaction.getBalanceBefore(), transaction.getBalanceAfter(),
                transaction.getReferenceDoc(), transaction.getReason(), transaction.getCreatedBy().getId(),
                transaction.getCreatedAt(), transaction.getProduct().getSku(), transaction.getProduct().getName());
    }

    private static BigDecimal priceOf(Product product) {
        return product.getPurchasePrice() == null ? BigDecimal.ZERO : product.getPurchasePrice();
    }

    private static int zero(Integer value) {
        return value == null ? 0 : value;
    }

    private static void validateChoice(String value, Set<String> allowed, String parameter) {
        if (value != null && !allowed.contains(value)) {
            throw new BadRequestException("INVALID_" + parameter.toUpperCase(),
                    "Parameter '" + parameter + "' has an unsupported value.");
        }
    }

    private static final class MutableTypeSummary {
        private final String type;
        private final String label;
        private long count;
        private long quantity;

        private MutableTypeSummary(String type, String label) {
            this.type = type;
            this.label = label;
        }

        private void add(long amount) {
            count++;
            quantity += amount;
        }

        private TransactionReportResponse.TypeSummary toResponse() {
            return new TransactionReportResponse.TypeSummary(type, label, count, quantity);
        }
    }
}

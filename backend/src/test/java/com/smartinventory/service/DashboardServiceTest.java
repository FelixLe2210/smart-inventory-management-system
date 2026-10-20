package com.smartinventory.service;

import com.smartinventory.model.Category;
import com.smartinventory.model.Inventory;
import com.smartinventory.model.InventoryTransaction;
import com.smartinventory.model.Product;
import com.smartinventory.model.User;
import com.smartinventory.model.Warehouse;
import com.smartinventory.repository.InventoryRepository;
import com.smartinventory.repository.InventoryTransactionRepository;
import com.smartinventory.repository.ProductRepository;
import com.smartinventory.repository.WarehouseRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DashboardServiceTest {

    @Mock
    private ProductRepository productRepository;
    @Mock
    private InventoryRepository inventoryRepository;
    @Mock
    private InventoryTransactionRepository transactionRepository;
    @Mock
    private WarehouseRepository warehouseRepository;

    @InjectMocks
    private DashboardService dashboardService;

    @Test
    void alertsAggregateAvailableStockAndMatchKpiCounts() {
        Product multiWarehouse = product(1L, "A", "Alpha", 10, "ACTIVE");
        Product low = product(2L, "B", "Beta", 20, "ACTIVE");
        Product noInventory = product(3L, "C", "Charlie", 5, "ACTIVE");
        Product reserved = product(4L, "D", "Delta", 10, "ACTIVE");
        Product threshold = product(5L, "Z", "Zeta", 10, "ACTIVE");
        Product inactive = product(6L, "E", "Inactive", 10, "INACTIVE");
        Warehouse hcm = warehouse(10L, "HCM");
        Warehouse hn = warehouse(11L, "HN");
        List<Product> products = List.of(multiWarehouse, low, noInventory, reserved, threshold, inactive);
        List<Inventory> inventories = List.of(
                inventory(multiWarehouse, hcm, 6, 0),
                inventory(multiWarehouse, hn, 5, 0),
                inventory(low, hcm, 15, 0),
                inventory(reserved, hn, 30, 30),
                inventory(threshold, hcm, 10, 0),
                inventory(inactive, hcm, 1, 0));
        when(productRepository.findAllWithCategory()).thenReturn(products);
        when(inventoryRepository.findAllWithReportDetails()).thenReturn(inventories);
        when(warehouseRepository.findAll()).thenReturn(List.of(hcm, hn));

        var alerts = dashboardService.getStockAlerts(null);

        assertThat(alerts).extracting("productSku").containsExactly("D", "C", "B", "Z");
        assertThat(alerts.get(0).type()).isEqualTo("OUT_OF_STOCK");
        assertThat(alerts.get(0).availableStock()).isZero();
        assertThat(alerts.get(0).warehouses().get(0).available()).isZero();
        assertThat(alerts.get(1).type()).isEqualTo("OUT_OF_STOCK");
        assertThat(alerts.get(1).warehouses()).isEmpty();
        assertThat(alerts.get(2).type()).isEqualTo("LOW_STOCK");
        assertThat(alerts.get(2).shortage()).isEqualTo(5);
        assertThat(alerts.get(3).shortage()).isZero();
        assertThat(dashboardService.getStockAlerts("LOW_STOCK"))
                .containsExactly(alerts.get(2), alerts.get(3));

        var kpis = dashboardService.getKpis();
        assertThat(kpis.lowStockCount()).isEqualTo(alerts.stream().filter(a -> "LOW_STOCK".equals(a.type())).count());
        assertThat(kpis.outOfStockCount())
                .isEqualTo(alerts.stream().filter(a -> "OUT_OF_STOCK".equals(a.type())).count());
    }

    @Test
    void inventoryReportTotalsUseCurrentStockAndPurchasePrice() {
        Product product = product(1L, "A", "Alpha", 10, "ACTIVE");
        product.setPurchasePrice(new BigDecimal("12.50"));
        Warehouse warehouse = warehouse(10L, "HN");
        List<Inventory> inventories = List.of(
                inventory(product, warehouse, 30, 5),
                inventory(product, warehouse(11L, "HCM"), 0, 0));
        when(inventoryRepository.findAllWithReportDetails()).thenReturn(inventories);

        var report = dashboardService.getInventoryReport(null, null, null);

        assertThat(report.summary().rowCount()).isEqualTo(2);
        assertThat(report.summary().totalQuantity()).isEqualTo(30);
        assertThat(report.summary().totalReserved()).isEqualTo(5);
        assertThat(report.summary().totalAvailable()).isEqualTo(25);
        assertThat(report.summary().totalValue()).isEqualByComparingTo("375.00");
        assertThat(report.rows()).extracting("status").containsExactly("OVER_STOCK", "OUT_OF_STOCK");
        assertThat(report.rows().get(0).stockValue()).isEqualByComparingTo("375.00");
    }

    @Test
    void transactionReportCountsTransfersOnceAndUsesDateEndExclusively() {
        Product product = product(1L, "A", "Alpha", 10, "ACTIVE");
        Warehouse source = warehouse(10L, "HN");
        Warehouse destination = warehouse(11L, "HCM");
        User actor = new User();
        ReflectionTestUtils.setField(actor, "id", 5L);
        List<InventoryTransaction> transactions = List.of(
                transaction("REC-1", "RECEIVING", product, null, destination, 100, 0, 100, actor),
                transaction("ISS-1", "ISSUING", product, source, null, 30, 30, 0, actor),
                transaction("TR-1-OUT", "TRANSFER_OUT", product, source, destination, 20, 30, 10, actor),
                transaction("TR-1-IN", "TRANSFER_IN", product, source, destination, 20, 0, 20, actor));
        when(transactionRepository.findForReport(
                LocalDate.of(2026, 10, 20).atStartOfDay(),
                LocalDate.of(2026, 10, 21).atStartOfDay(),
                null, null, null)).thenReturn(transactions);

        var report = dashboardService.getTransactionReport(
                LocalDate.of(2026, 10, 20), LocalDate.of(2026, 10, 20), null, null, null);

        assertThat(report.summary().totalCount()).isEqualTo(4);
        assertThat(report.summary().receivedQuantity()).isEqualTo(100);
        assertThat(report.summary().issuedQuantity()).isEqualTo(30);
        assertThat(report.summary().transferredQuantity()).isEqualTo(20);
        assertThat(report.summary().netChange()).isEqualTo(70);
        verify(transactionRepository).findForReport(
                LocalDate.of(2026, 10, 20).atStartOfDay(),
                LocalDate.of(2026, 10, 21).atStartOfDay(),
                null, null, null);
    }

    @Test
    void transactionReportIncludesTransferChangeOnlyWhenWarehouseFiltered() {
        Product product = product(1L, "A", "Alpha", 10, "ACTIVE");
        Warehouse source = warehouse(10L, "HN");
        Warehouse destination = warehouse(11L, "HCM");
        User actor = new User();
        ReflectionTestUtils.setField(actor, "id", 5L);
        InventoryTransaction transferIn =
                transaction("TR-1-IN", "TRANSFER_IN", product, source, destination, 20, 0, 20, actor);
        when(transactionRepository.findForReport(null, null, null, 11L, null)).thenReturn(List.of(transferIn));

        var report = dashboardService.getTransactionReport(null, null, null, 11L, null);

        assertThat(report.summary().netChange()).isEqualTo(20);
        assertThat(report.summary().transferredQuantity()).isZero();
    }

    @Test
    void rejectsReversedDateRangeAndUnknownAlertType() {
        assertThatThrownBy(() -> dashboardService.getTransactionReport(
                LocalDate.of(2026, 10, 21), LocalDate.of(2026, 10, 20), null, null, null))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("'from' must be on or before 'to'");
        assertThatThrownBy(() -> dashboardService.getStockAlerts("UNKNOWN"))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("unsupported value");
    }

    private static Product product(Long id, String sku, String name, int minimum, String status) {
        Category category = new Category();
        ReflectionTestUtils.setField(category, "id", 1L);
        category.setName("Test category");
        Product product = new Product();
        ReflectionTestUtils.setField(product, "id", id);
        product.setSku(sku);
        product.setName(name);
        product.setCategory(category);
        product.setMinStockLevel(minimum);
        product.setMaxStockLevel(25);
        product.setPurchasePrice(BigDecimal.ONE);
        product.setStatus(status);
        return product;
    }

    private static Warehouse warehouse(Long id, String code) {
        Warehouse warehouse = new Warehouse();
        ReflectionTestUtils.setField(warehouse, "id", id);
        warehouse.setCode(code);
        warehouse.setName("Warehouse " + code);
        warehouse.setStatus("ACTIVE");
        return warehouse;
    }

    private static Inventory inventory(Product product, Warehouse warehouse, int current, int reserved) {
        Inventory inventory = new Inventory(product, warehouse, current, reserved, null);
        ReflectionTestUtils.setField(inventory, "id", product.getId() + warehouse.getId());
        return inventory;
    }

    private static InventoryTransaction transaction(
            String code, String type, Product product, Warehouse source, Warehouse destination,
            int quantity, int before, int after, User actor
    ) {
        InventoryTransaction transaction = new InventoryTransaction(
                code, type, product, source, destination, quantity, before, after, null, null, actor);
        ReflectionTestUtils.setField(transaction, "createdAt", LocalDateTime.of(2026, 10, 20, 23, 59));
        return transaction;
    }
}

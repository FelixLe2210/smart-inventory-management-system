package com.smartinventory.repository;

import com.smartinventory.model.Category;
import com.smartinventory.model.Inventory;
import com.smartinventory.model.Product;
import com.smartinventory.model.Warehouse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DataJpaTest(properties = {
        "spring.flyway.enabled=false",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect"
})
class InventoryRepositoryTest {

    @Autowired
    private TestEntityManager entityManager;

    @Autowired
    private InventoryRepository inventoryRepository;

    private Product product;
    private Warehouse warehouse;

    @BeforeEach
    void setUp() {
        Category category = new Category();
        category.setCode("CAT-01");
        category.setName("Linh kiện");
        entityManager.persist(category);

        product = new Product();
        product.setSku("SKU-01");
        product.setBarcode("BAR-01");
        product.setName("Sản phẩm kiểm thử");
        product.setCategory(category);
        product.setMinStockLevel(10);
        entityManager.persist(product);

        warehouse = new Warehouse();
        warehouse.setCode("WH-01");
        warehouse.setName("Kho kiểm thử");
        warehouse.setAddress("Đà Nẵng");
        entityManager.persist(warehouse);
    }

    @Test
    @DisplayName("Truy vấn tồn kho tải đúng liên kết Product, Warehouse và lọc tồn thấp")
    void inventoryQueriesReturnMappedProductAndWarehouse() {
        Inventory inventory = new Inventory(product, warehouse, 8, 3, "A-01");
        entityManager.persistAndFlush(inventory);
        entityManager.clear();

        var byProductAndWarehouse = inventoryRepository.findByProductIdAndWarehouseId(
                product.getId(), warehouse.getId());

        assertThat(byProductAndWarehouse).isPresent();
        assertThat(byProductAndWarehouse.orElseThrow().getProduct().getSku()).isEqualTo("SKU-01");
        assertThat(byProductAndWarehouse.orElseThrow().getWarehouse().getCode()).isEqualTo("WH-01");
        assertThat(byProductAndWarehouse.orElseThrow().getAvailableStock()).isEqualTo(5);
        assertThat(inventoryRepository.findByProductId(product.getId())).hasSize(1);
        assertThat(inventoryRepository.findByWarehouseId(warehouse.getId())).hasSize(1);
        assertThat(inventoryRepository.findAllWithDetails()).hasSize(1);
        assertThat(inventoryRepository.findLowStockInventories())
                .extracting(Inventory::getId)
                .containsExactly(inventory.getId());
    }

    @Test
    @DisplayName("Không cho phép tạo trùng tồn kho cho cùng một sản phẩm tại cùng một kho")
    void productAndWarehousePairMustBeUnique() {
        entityManager.persistAndFlush(new Inventory(product, warehouse, 8, 3, "A-01"));

        assertThatThrownBy(() -> inventoryRepository.saveAndFlush(
                new Inventory(product, warehouse, 12, 0, "A-02")))
                .isInstanceOf(DataIntegrityViolationException.class);
    }
}

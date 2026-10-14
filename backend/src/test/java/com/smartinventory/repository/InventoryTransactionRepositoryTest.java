package com.smartinventory.repository;

import com.smartinventory.model.Category;
import com.smartinventory.model.Inventory;
import com.smartinventory.model.InventoryTransaction;
import com.smartinventory.model.Product;
import com.smartinventory.model.User;
import com.smartinventory.model.Warehouse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest(properties = {
        "spring.flyway.enabled=false",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect"
})
class InventoryTransactionRepositoryTest {

    @Autowired
    private TestEntityManager entityManager;

    @Autowired
    private InventoryTransactionRepository transactionRepository;

    private Product product;
    private Warehouse source;
    private Warehouse destination;
    private User actor;

    @BeforeEach
    void setUp() {
        Category category = new Category();
        category.setCode("CAT-TX");
        category.setName("Transaction test");
        entityManager.persist(category);

        product = new Product();
        product.setSku("SKU-TX");
        product.setBarcode("BAR-TX");
        product.setName("Transaction product");
        product.setCategory(category);
        entityManager.persist(product);

        source = warehouse("WH-TX-SOURCE");
        destination = warehouse("WH-TX-DEST");
        entityManager.persist(source);
        entityManager.persist(destination);

        actor = new User();
        actor.setUsername("inventory-operator");
        actor.setEmail("operator@example.test");
        actor.setPasswordHash("test-hash");
        entityManager.persist(actor);

        entityManager.persist(new Inventory(product, source, 20, 0, null));
        entityManager.flush();
    }

    private Warehouse warehouse(String code) {
        Warehouse warehouse = new Warehouse();
        warehouse.setCode(code);
        warehouse.setName(code);
        warehouse.setAddress("Test");
        return warehouse;
    }

    @Test
    @DisplayName("Lưu transaction type, balance và truy vấn một leg chuyển theo từng kho")
    void transactionHistoryIsQueryableForEachWarehouse() {
        entityManager.persist(new InventoryTransaction(
                "TXN-TRANSFER-OUT", "TRANSFER_OUT", product, source, destination,
                5, 20, 15, "MOVE-01", "Transfer", actor));
        entityManager.persist(new InventoryTransaction(
                "TXN-TRANSFER-IN", "TRANSFER_IN", product, source, destination,
                5, 0, 5, "MOVE-01", "Transfer", actor));
        entityManager.flush();
        entityManager.clear();

        List<InventoryTransaction> sourceHistory =
                transactionRepository.findByProductAndWarehouse(product.getId(), source.getId());
        List<InventoryTransaction> destinationHistory =
                transactionRepository.findByProductAndWarehouse(product.getId(), destination.getId());

        assertThat(sourceHistory).hasSize(1);
        assertThat(sourceHistory.get(0).getTransactionType()).isEqualTo("TRANSFER_OUT");
        assertThat(sourceHistory.get(0).getBalanceBefore()).isEqualTo(20);
        assertThat(sourceHistory.get(0).getBalanceAfter()).isEqualTo(15);
        assertThat(destinationHistory).hasSize(1);
        assertThat(destinationHistory.get(0).getTransactionType()).isEqualTo("TRANSFER_IN");
        assertThat(destinationHistory.get(0).getBalanceBefore()).isZero();
        assertThat(destinationHistory.get(0).getBalanceAfter()).isEqualTo(5);
    }
}

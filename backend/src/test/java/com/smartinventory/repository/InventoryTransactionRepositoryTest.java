package com.smartinventory.repository;

import com.smartinventory.model.Category;
import com.smartinventory.model.Inventory;
import com.smartinventory.model.InventoryTransaction;
import com.smartinventory.model.Product;
import com.smartinventory.model.User;
import com.smartinventory.model.Warehouse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;

import java.util.List;
import java.sql.SQLException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

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
        InventoryTransaction transferOut = new InventoryTransaction(
                "TXN-TRANSFER-OUT", "TRANSFER_OUT", product, source, destination,
                5, 20, 15, "MOVE-01", "Transfer", actor);
        InventoryTransaction transferIn = new InventoryTransaction(
                "TXN-TRANSFER-IN", "TRANSFER_IN", product, source, destination,
                5, 0, 5, "MOVE-01", "Transfer", actor);
        entityManager.persist(transferOut);
        entityManager.persist(transferIn);
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
        assertThat(transferOut.getTransactionNo()).isEqualTo(transferIn.getTransactionNo());
        assertThat(transferOut.getLineNo()).isEqualTo(1);
        assertThat(transferIn.getLineNo()).isEqualTo(2);
    }

    @Test
    @DisplayName("Lịch sử toàn hệ thống lọc đúng từng phía chuyển kho và phân trang")
    void globalTransactionHistoryFiltersAndPaginates() {
        entityManager.persist(new InventoryTransaction(
                "TXN-GLOBAL-OUT", "TRANSFER_OUT", product, source, destination,
                5, 20, 15, "MOVE-GLOBAL", "Transfer", actor));
        entityManager.persist(new InventoryTransaction(
                "TXN-GLOBAL-IN", "TRANSFER_IN", product, source, destination,
                5, 0, 5, "MOVE-GLOBAL", "Transfer", actor));
        entityManager.persist(new InventoryTransaction(
                "TXN-RECEIVE", "RECEIVING", product, null, destination,
                7, 0, 7, "PO-GLOBAL", "Restock", actor));
        entityManager.flush();

        Page<InventoryTransaction> destinationTransfers = transactionRepository.searchTransactions(
                product.getId(), destination.getId(), "TRANSFER_IN", null, PageRequest.of(0, 1));
        Page<InventoryTransaction> sourceTransfers = transactionRepository.searchTransactions(
                product.getId(), source.getId(), "TRANSFER_IN", null, PageRequest.of(0, 10));
        Page<InventoryTransaction> keywordMatches = transactionRepository.searchTransactions(
                product.getId(), null, null, "move-global", PageRequest.of(0, 1));

        assertThat(destinationTransfers.getTotalElements()).isEqualTo(1);
        assertThat(destinationTransfers.getContent()).hasSize(1);
        assertThat(destinationTransfers.getTotalPages()).isEqualTo(1);
        assertThat(sourceTransfers.getTotalElements()).isZero();
        assertThat(keywordMatches.getTotalElements()).isEqualTo(2);
        assertThat(keywordMatches.getContent()).hasSize(1);
    }

    @Test
    @DisplayName("Database từ chối hai dòng có cùng transactionNo và lineNo")
    void transactionNumberAndLineNumberMustBeUniqueTogether() {
        InventoryTransaction first = new InventoryTransaction(
                "TXN-UNIQUE-OUT", "TRANSFER_OUT", product, source, destination,
                1, 20, 19, null, null, actor);
        InventoryTransaction duplicateLine = new InventoryTransaction(
                "TXN-OTHER-OUT", "TRANSFER_OUT", product, source, destination,
                1, 20, 19, null, null, actor);
        org.springframework.test.util.ReflectionTestUtils.setField(
                duplicateLine, "transactionNo", first.getTransactionNo());

        assertThatThrownBy(() -> {
            entityManager.persist(first);
            entityManager.persist(duplicateLine);
            entityManager.flush();
        }).hasRootCauseInstanceOf(SQLException.class);
    }
}

package com.smartinventory.service;

import com.smartinventory.dto.InventoryAdjustRequest;
import com.smartinventory.dto.InventoryCreateRequest;
import com.smartinventory.dto.InventoryResponse;
import com.smartinventory.dto.InventoryTransactionResponse;
import com.smartinventory.dto.InventoryTransferRequest;
import com.smartinventory.dto.InventoryUpdateRequest;
import com.smartinventory.dto.TransactionHistoryPageResponse;
import com.smartinventory.exception.BadRequestException;
import com.smartinventory.exception.ConflictException;
import com.smartinventory.exception.NotFoundException;
import com.smartinventory.exception.UnauthorizedException;
import com.smartinventory.model.Inventory;
import com.smartinventory.model.InventoryTransaction;
import com.smartinventory.model.Product;
import com.smartinventory.model.User;
import com.smartinventory.model.Warehouse;
import com.smartinventory.repository.InventoryRepository;
import com.smartinventory.repository.InventoryTransactionRepository;
import com.smartinventory.repository.ProductRepository;
import com.smartinventory.repository.UserRepository;
import com.smartinventory.repository.WarehouseRepository;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@Transactional(readOnly = true)
public class InventoryService {

    private final InventoryRepository inventoryRepository;
    private final InventoryTransactionRepository transactionRepository;
    private final ProductRepository productRepository;
    private final WarehouseRepository warehouseRepository;
    private final UserRepository userRepository;

    public InventoryService(InventoryRepository inventoryRepository,
                            InventoryTransactionRepository transactionRepository,
                            ProductRepository productRepository,
                            WarehouseRepository warehouseRepository,
                            UserRepository userRepository) {
        this.inventoryRepository = inventoryRepository;
        this.transactionRepository = transactionRepository;
        this.productRepository = productRepository;
        this.warehouseRepository = warehouseRepository;
        this.userRepository = userRepository;
    }

    public List<InventoryResponse> getAllInventories(Long productId, Long warehouseId, Boolean lowStockOnly) {
        List<Inventory> list;
        if (Boolean.TRUE.equals(lowStockOnly)) {
            list = inventoryRepository.findLowStockInventories();
        } else if (productId != null && warehouseId != null) {
            return inventoryRepository.findByProductIdAndWarehouseId(productId, warehouseId)
                    .map(inv -> List.of(InventoryResponse.from(inv)))
                    .orElse(List.of());
        } else if (productId != null) {
            list = inventoryRepository.findByProductId(productId);
        } else if (warehouseId != null) {
            list = inventoryRepository.findByWarehouseId(warehouseId);
        } else {
            list = inventoryRepository.findAllWithDetails();
        }

        return list.stream()
                .map(InventoryResponse::from)
                .toList();
    }

    public InventoryResponse getInventoryById(Long id) {
        Inventory inventory = inventoryRepository.findByIdWithDetails(id)
                .orElseThrow(() -> new NotFoundException("INVENTORY_NOT_FOUND", "Không tìm thấy bản ghi tồn kho với ID: " + id));
        return InventoryResponse.from(inventory);
    }

    public InventoryResponse getInventoryByProductAndWarehouse(Long productId, Long warehouseId) {
        Inventory inventory = inventoryRepository.findByProductIdAndWarehouseId(productId, warehouseId)
                .orElseThrow(() -> new NotFoundException("INVENTORY_NOT_FOUND",
                        "Không tìm thấy tồn kho cho sản phẩm ID " + productId + " tại kho ID " + warehouseId));
        return InventoryResponse.from(inventory);
    }

    public List<InventoryResponse> getLowStockInventories() {
        return inventoryRepository.findLowStockInventories().stream()
                .map(InventoryResponse::from)
                .toList();
    }

    @Transactional
    public InventoryResponse createInventory(InventoryCreateRequest request) {
        Product product = productRepository.findById(request.productId())
                .orElseThrow(() -> new NotFoundException("PRODUCT_NOT_FOUND", "Không tìm thấy sản phẩm với ID: " + request.productId()));

        Warehouse warehouse = warehouseRepository.findByIdForUpdate(request.warehouseId())
                .orElseThrow(() -> new NotFoundException("WAREHOUSE_NOT_FOUND", "Không tìm thấy kho với ID: " + request.warehouseId()));

        validateProductActive(product);
        validateWarehouseActive(warehouse);
        User actor = currentUser();

        if (inventoryRepository.existsByProductIdAndWarehouseId(request.productId(), request.warehouseId())) {
            throw new ConflictException("INVENTORY_EXISTS",
                    "Sản phẩm '" + product.getName() + "' đã được thiết lập tồn kho tại kho '" + warehouse.getName() + "'.");
        }

        int initialStock = request.initialStock() != null ? request.initialStock() : 0;
        int reservedStock = request.reservedStock() != null ? request.reservedStock() : 0;

        if (initialStock < 0) {
            throw new BadRequestException("INVALID_STOCK", "Số lượng tồn kho ban đầu không được âm.");
        }
        if (reservedStock < 0) {
            throw new BadRequestException("INVALID_RESERVED_STOCK", "Số lượng giữ chỗ không được âm.");
        }
        if (reservedStock > initialStock) {
            throw new BadRequestException("INVALID_RESERVED_STOCK",
                    "Số lượng giữ chỗ (" + reservedStock + ") không được vượt quá số lượng tồn kho ban đầu (" + initialStock + ").");
        }

        Inventory inventory = new Inventory(product, warehouse, initialStock, reservedStock, request.locationInWarehouse());
        if (initialStock > 0) {
            inventory.setLastStockCountAt(LocalDateTime.now());
        }

        Inventory saved = inventoryRepository.save(inventory);
        if (initialStock > 0) {
            recordTransaction("ADJUSTMENT", product, warehouse, null, initialStock,
                    0, initialStock, null, "Initial stock", actor);
        }
        return InventoryResponse.from(saved);
    }

    @Transactional
    public InventoryResponse updateInventory(Long id, InventoryUpdateRequest request) {
        Inventory inventory = inventoryRepository.findByIdWithDetails(id)
                .orElseThrow(() -> new NotFoundException("INVENTORY_NOT_FOUND", "Không tìm thấy bản ghi tồn kho với ID: " + id));

        if (request.locationInWarehouse() != null) {
            inventory.setLocationInWarehouse(request.locationInWarehouse());
        }
        if (request.lastStockCountAt() != null) {
            inventory.setLastStockCountAt(request.lastStockCountAt());
        }

        return InventoryResponse.from(inventory);
    }

    /**
     * Điều chỉnh số lượng tồn kho theo quy tắc Stock Validation Rules.
     */
    @Transactional
    public InventoryResponse adjustStock(Long id, InventoryAdjustRequest request) {
        Inventory reference = inventoryRepository.findByIdWithDetails(id)
                .orElseThrow(() -> new NotFoundException("INVENTORY_NOT_FOUND", "Không tìm thấy bản ghi tồn kho với ID: " + id));
        lockWarehouse(reference.getWarehouse().getId());
        Inventory inventory = inventoryRepository.findByIdWithDetailsForUpdate(id)
                .orElseThrow(() -> new NotFoundException("INVENTORY_NOT_FOUND", "Không tìm thấy bản ghi tồn kho với ID: " + id));

        validateProductActive(inventory.getProduct());
        validateWarehouseActive(inventory.getWarehouse());
        User actor = currentUser();

        String type = request.adjustmentType().toUpperCase(java.util.Locale.ROOT);
        int qty = request.quantity();

        int current = inventory.getCurrentStock() != null ? inventory.getCurrentStock() : 0;
        int reserved = inventory.getReservedStock() != null ? inventory.getReservedStock() : 0;
        validateStockConsistency(current, reserved);
        int available = current - reserved;
        int balanceAfter = current;
        String transactionType = null;

        switch (type) {
            case "SET" -> {
                if (qty < 0) {
                    throw new BadRequestException("INVALID_STOCK", "Số lượng tồn kho thiết lập không được âm.");
                }
                if (qty < reserved) {
                    throw new BadRequestException("INVALID_STOCK",
                            "Tồn kho mới (" + qty + ") không thể nhỏ hơn số lượng hàng đang được giữ chỗ (" + reserved + ").");
                }
                inventory.setCurrentStock(qty);
                inventory.setLastStockCountAt(LocalDateTime.now());
                balanceAfter = qty;
                transactionType = "ADJUSTMENT";
            }
            case "IN" -> {
                if (qty <= 0) {
                    throw new BadRequestException("INVALID_QUANTITY", "Số lượng nhập kho phải lớn hơn 0.");
                }
                balanceAfter = addStock(current, qty);
                inventory.setCurrentStock(balanceAfter);
                transactionType = "RECEIVING";
            }
            case "OUT" -> {
                if (qty <= 0) {
                    throw new BadRequestException("INVALID_QUANTITY", "Số lượng xuất kho phải lớn hơn 0.");
                }
                if (qty > available) {
                    throw new BadRequestException("INSUFFICIENT_STOCK",
                            "Không đủ tồn kho khả dụng để xuất. Tồn hiện tại: " + current
                                    + ", đang giữ chỗ: " + reserved
                                    + ", khả dụng: " + available
                                    + ", yêu cầu xuất: " + qty + ".");
                }
                balanceAfter = current - qty;
                inventory.setCurrentStock(balanceAfter);
                transactionType = "ISSUING";
            }
            case "RESERVE" -> {
                if (qty <= 0) {
                    throw new BadRequestException("INVALID_QUANTITY", "Số lượng giữ chỗ phải lớn hơn 0.");
                }
                if (qty > available) {
                    throw new BadRequestException("INSUFFICIENT_AVAILABLE_STOCK",
                            "Số lượng tồn kho khả dụng không đủ để giữ chỗ. Khả dụng: " + available
                                    + ", yêu cầu giữ chỗ: " + qty + ".");
                }
                inventory.setReservedStock(reserved + qty);
            }
            case "RELEASE" -> {
                if (qty <= 0) {
                    throw new BadRequestException("INVALID_QUANTITY", "Số lượng giải phóng giữ chỗ phải lớn hơn 0.");
                }
                if (qty > reserved) {
                    throw new BadRequestException("INVALID_RESERVED_STOCK",
                            "Số lượng giải phóng (" + qty + ") không được vượt quá số lượng đang giữ chỗ (" + reserved + ").");
                }
                inventory.setReservedStock(reserved - qty);
            }
            default -> throw new BadRequestException("INVALID_ADJUSTMENT_TYPE", "Loại điều chỉnh không hợp lệ: " + type);
        }

        if (transactionType != null) {
            transactionRepository.save(newTransaction(
                    transactionType, inventory.getProduct(),
                    "ISSUING".equals(transactionType) || "ADJUSTMENT".equals(transactionType)
                            ? inventory.getWarehouse() : null,
                    "RECEIVING".equals(transactionType) ? inventory.getWarehouse() : null,
                    qty, current, balanceAfter, request.referenceDoc(), request.reason(), actor));
        }
        return InventoryResponse.from(inventory);
    }

    @Transactional
    public InventoryResponse transferStock(Long sourceInventoryId, InventoryTransferRequest request) {
        if (request.quantity() <= 0) {
            throw new BadRequestException("INVALID_QUANTITY", "Số lượng chuyển kho phải lớn hơn 0.");
        }

        Inventory sourceReference = inventoryRepository.findByIdWithDetails(sourceInventoryId)
                .orElseThrow(() -> new NotFoundException("INVENTORY_NOT_FOUND",
                        "Không tìm thấy bản ghi tồn kho với ID: " + sourceInventoryId));
        Long sourceWarehouseId = sourceReference.getWarehouse().getId();
        Long destinationWarehouseId = request.destinationWarehouseId();
        if (sourceWarehouseId.equals(destinationWarehouseId)) {
            throw new BadRequestException("SAME_WAREHOUSE_TRANSFER",
                    "Kho nguồn và kho đích không được trùng nhau.");
        }

        Warehouse sourceWarehouse;
        Warehouse destinationWarehouse;
        if (sourceWarehouseId < destinationWarehouseId) {
            sourceWarehouse = lockWarehouse(sourceWarehouseId);
            destinationWarehouse = lockWarehouse(destinationWarehouseId);
        } else {
            destinationWarehouse = lockWarehouse(destinationWarehouseId);
            sourceWarehouse = lockWarehouse(sourceWarehouseId);
        }
        validateWarehouseActive(sourceWarehouse);
        validateWarehouseActive(destinationWarehouse);

        Inventory source = inventoryRepository.findByIdWithDetailsForUpdate(sourceInventoryId)
                .orElseThrow(() -> new NotFoundException("INVENTORY_NOT_FOUND",
                        "Không tìm thấy bản ghi tồn kho với ID: " + sourceInventoryId));
        validateProductActive(source.getProduct());
        int sourceStock = source.getCurrentStock() != null ? source.getCurrentStock() : 0;
        int sourceReserved = source.getReservedStock() != null ? source.getReservedStock() : 0;
        validateStockConsistency(sourceStock, sourceReserved);
        int quantity = request.quantity();
        if (quantity > sourceStock - sourceReserved) {
            throw new BadRequestException("INSUFFICIENT_STOCK",
                    "Không đủ tồn kho khả dụng để chuyển. Khả dụng: " + (sourceStock - sourceReserved)
                            + ", yêu cầu chuyển: " + quantity + ".");
        }

        Inventory destination = inventoryRepository.findByProductIdAndWarehouseIdForUpdate(
                        source.getProduct().getId(), destinationWarehouseId)
                .orElseGet(() -> inventoryRepository.save(
                        new Inventory(source.getProduct(), destinationWarehouse, 0, 0, null)));
        int destinationStock = destination.getCurrentStock() != null ? destination.getCurrentStock() : 0;
        int destinationReserved = destination.getReservedStock() != null ? destination.getReservedStock() : 0;
        validateStockConsistency(destinationStock, destinationReserved);
        int destinationBalanceAfter = addStock(destinationStock, quantity);

        source.setCurrentStock(sourceStock - quantity);
        destination.setCurrentStock(destinationBalanceAfter);

        String transferCode = "TXN-" + UUID.randomUUID().toString().replace("-", "");
        User actor = currentUser();
        transactionRepository.save(new InventoryTransaction(
                transferCode + "-OUT", "TRANSFER_OUT", source.getProduct(),
                sourceWarehouse, destinationWarehouse, quantity, sourceStock, sourceStock - quantity,
                request.referenceDoc(), request.reason(), actor));
        transactionRepository.save(new InventoryTransaction(
                transferCode + "-IN", "TRANSFER_IN", source.getProduct(),
                sourceWarehouse, destinationWarehouse, quantity, destinationStock, destinationBalanceAfter,
                request.referenceDoc(), request.reason(), actor));

        inventoryRepository.save(source);
        inventoryRepository.save(destination);
        return InventoryResponse.from(destination);
    }

    public List<InventoryTransactionResponse> getTransactions(Long inventoryId) {
        Inventory inventory = inventoryRepository.findByIdWithDetails(inventoryId)
                .orElseThrow(() -> new NotFoundException("INVENTORY_NOT_FOUND",
                        "Không tìm thấy bản ghi tồn kho với ID: " + inventoryId));
        return transactionRepository.findByProductAndWarehouse(
                        inventory.getProduct().getId(), inventory.getWarehouse().getId())
                .stream()
                .map(InventoryTransactionResponse::from)
                .toList();
    }

    public TransactionHistoryPageResponse getTransactionHistory(
            Long productId, Long warehouseId, String type, String search, int page, int size) {
        if (page < 0) {
            throw new BadRequestException("INVALID_PAGE", "Số trang không được âm.");
        }
        if (size < 1 || size > 100) {
            throw new BadRequestException("INVALID_PAGE_SIZE", "Kích thước trang phải từ 1 đến 100.");
        }

        String transactionType = type == null || type.isBlank() ? null : type.trim().toUpperCase(java.util.Locale.ROOT);
        if (transactionType != null && !List.of(
                "RECEIVING", "ISSUING", "TRANSFER_IN", "TRANSFER_OUT", "ADJUSTMENT"
        ).contains(transactionType)) {
            throw new BadRequestException("INVALID_TRANSACTION_TYPE", "Loại giao dịch không hợp lệ: " + type);
        }
        String keyword = search == null || search.isBlank() ? null : search.trim();

        Page<InventoryTransactionResponse> result = transactionRepository.searchTransactions(
                        productId, warehouseId, transactionType, keyword,
                        PageRequest.of(page, size, Sort.unsorted()))
                .map(InventoryTransactionResponse::from);
        return TransactionHistoryPageResponse.from(result);
    }

    private Warehouse lockWarehouse(Long warehouseId) {
        return warehouseRepository.findByIdForUpdate(warehouseId)
                .orElseThrow(() -> new NotFoundException("WAREHOUSE_NOT_FOUND",
                        "Không tìm thấy kho với ID: " + warehouseId));
    }

    private void validateProductActive(Product product) {
        if (product == null || product.getStatus() == null || !"ACTIVE".equalsIgnoreCase(product.getStatus())) {
            throw new BadRequestException("PRODUCT_NOT_ACTIVE",
                    "Sản phẩm không hoạt động, không thể thực hiện giao dịch tồn kho.");
        }
    }

    private void validateWarehouseActive(Warehouse warehouse) {
        if (warehouse == null || warehouse.getStatus() == null || !"ACTIVE".equalsIgnoreCase(warehouse.getStatus())) {
            throw new BadRequestException("WAREHOUSE_NOT_ACTIVE",
                    "Kho '" + (warehouse != null ? warehouse.getName() : "") + "' đang ở trạng thái "
                            + (warehouse != null ? warehouse.getStatus() : null)
                            + ", không thể thực hiện giao dịch tồn kho.");
        }
    }

    private void validateStockConsistency(int current, int reserved) {
        if (current < 0 || reserved < 0 || reserved > current) {
            throw new ConflictException("STOCK_INCONSISTENT",
                    "Dữ liệu tồn kho không nhất quán; tồn hiện tại/giữ chỗ không hợp lệ.");
        }
    }

    private int addStock(int current, int quantity) {
        try {
            return Math.addExact(current, quantity);
        } catch (ArithmeticException exception) {
            throw new BadRequestException("STOCK_LIMIT_EXCEEDED", "Số lượng tồn kho vượt quá giới hạn cho phép.");
        }
    }

    private InventoryTransaction newTransaction(String type, Product product, Warehouse sourceWarehouse,
                                                Warehouse destinationWarehouse, int quantity,
                                                int balanceBefore, int balanceAfter,
                                                String referenceDoc, String reason, User actor) {
        String code = "TXN-" + UUID.randomUUID().toString().replace("-", "");
        return new InventoryTransaction(code, type, product, sourceWarehouse, destinationWarehouse,
                quantity, balanceBefore, balanceAfter, referenceDoc, reason, actor);
    }

    private void recordTransaction(String type, Product product, Warehouse sourceWarehouse,
                                   Warehouse destinationWarehouse, int quantity,
                                   int balanceBefore, int balanceAfter, String referenceDoc,
                                   String reason, User actor) {
        String code = "TXN-" + UUID.randomUUID().toString().replace("-", "");
        transactionRepository.save(new InventoryTransaction(code, type, product, sourceWarehouse,
                destinationWarehouse, quantity, balanceBefore, balanceAfter,
                referenceDoc, reason, actor));
    }

    private User currentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()
                || !(authentication.getPrincipal() instanceof String username)) {
            throw new UnauthorizedException("UNAUTHORIZED", "Authentication is required for stock transactions.");
        }
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UnauthorizedException("UNAUTHORIZED",
                        "The authenticated user could not be identified."));
        if (!Boolean.TRUE.equals(user.getActive())) {
            throw new UnauthorizedException("ACCOUNT_DISABLED",
                    "This account has been disabled.");
        }
        return user;
    }
}

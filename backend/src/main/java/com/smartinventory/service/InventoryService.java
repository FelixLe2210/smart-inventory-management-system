package com.smartinventory.service;

import com.smartinventory.dto.InventoryAdjustRequest;
import com.smartinventory.dto.InventoryCreateRequest;
import com.smartinventory.dto.InventoryResponse;
import com.smartinventory.dto.InventoryUpdateRequest;
import com.smartinventory.exception.BadRequestException;
import com.smartinventory.exception.ConflictException;
import com.smartinventory.exception.NotFoundException;
import com.smartinventory.model.Inventory;
import com.smartinventory.model.Product;
import com.smartinventory.model.Warehouse;
import com.smartinventory.repository.InventoryRepository;
import com.smartinventory.repository.ProductRepository;
import com.smartinventory.repository.WarehouseRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@Transactional(readOnly = true)
public class InventoryService {

    private final InventoryRepository inventoryRepository;
    private final ProductRepository productRepository;
    private final WarehouseRepository warehouseRepository;

    public InventoryService(InventoryRepository inventoryRepository,
                            ProductRepository productRepository,
                            WarehouseRepository warehouseRepository) {
        this.inventoryRepository = inventoryRepository;
        this.productRepository = productRepository;
        this.warehouseRepository = warehouseRepository;
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

        Warehouse warehouse = warehouseRepository.findById(request.warehouseId())
                .orElseThrow(() -> new NotFoundException("WAREHOUSE_NOT_FOUND", "Không tìm thấy kho với ID: " + request.warehouseId()));

        validateWarehouseActive(warehouse);

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
        Inventory inventory = inventoryRepository.findByIdWithDetails(id)
                .orElseThrow(() -> new NotFoundException("INVENTORY_NOT_FOUND", "Không tìm thấy bản ghi tồn kho với ID: " + id));

        validateWarehouseActive(inventory.getWarehouse());

        String type = request.adjustmentType().toUpperCase();
        int qty = request.quantity();

        int current = inventory.getCurrentStock() != null ? inventory.getCurrentStock() : 0;
        int reserved = inventory.getReservedStock() != null ? inventory.getReservedStock() : 0;
        int available = current - reserved;

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
            }
            case "IN" -> {
                if (qty <= 0) {
                    throw new BadRequestException("INVALID_QUANTITY", "Số lượng nhập kho phải lớn hơn 0.");
                }
                inventory.setCurrentStock(current + qty);
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
                inventory.setCurrentStock(current - qty);
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

        return InventoryResponse.from(inventory);
    }

    private void validateWarehouseActive(Warehouse warehouse) {
        if (warehouse != null && warehouse.getStatus() != null && !"ACTIVE".equalsIgnoreCase(warehouse.getStatus())) {
            throw new BadRequestException("WAREHOUSE_NOT_ACTIVE",
                    "Kho '" + warehouse.getName() + "' đang ở trạng thái " + warehouse.getStatus()
                            + ", không thể thực hiện giao dịch tồn kho.");
        }
    }
}

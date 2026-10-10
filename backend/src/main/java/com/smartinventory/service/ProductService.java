package com.smartinventory.service;

import com.smartinventory.dto.ProductRequest;
import com.smartinventory.dto.ProductResponse;
import com.smartinventory.exception.BadRequestException;
import com.smartinventory.exception.ConflictException;
import com.smartinventory.exception.NotFoundException;
import com.smartinventory.model.Category;
import com.smartinventory.model.Product;
import com.smartinventory.model.Supplier;
import com.smartinventory.repository.CategoryRepository;
import com.smartinventory.repository.InventoryRepository;
import com.smartinventory.repository.ProductRepository;
import com.smartinventory.repository.SupplierRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class ProductService {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final SupplierRepository supplierRepository;
    private final InventoryRepository inventoryRepository;

    public ProductService(ProductRepository productRepository,
                          CategoryRepository categoryRepository,
                          SupplierRepository supplierRepository,
                          InventoryRepository inventoryRepository) {
        this.productRepository = productRepository;
        this.categoryRepository = categoryRepository;
        this.supplierRepository = supplierRepository;
        this.inventoryRepository = inventoryRepository;
    }

    @Transactional(readOnly = true)
    public List<ProductResponse> getAllProducts() {
        return productRepository.findAll().stream()
                .map(ProductResponse::from)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ProductResponse getProductById(Long id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("PRODUCT_NOT_FOUND", "Không tìm thấy sản phẩm với ID: " + id));
        return ProductResponse.from(product);
    }

    public ProductResponse createProduct(ProductRequest request) {
        if (productRepository.existsBySku(request.getSku())) {
            throw new ConflictException("DUPLICATE_SKU", "Mã SKU đã tồn tại: " + request.getSku());
        }
        if (productRepository.existsByBarcode(request.getBarcode())) {
            throw new ConflictException("DUPLICATE_BARCODE", "Mã barcode đã tồn tại: " + request.getBarcode());
        }
        if (request.getMinStockLevel() != null && request.getMaxStockLevel() != null
                && request.getMinStockLevel() > request.getMaxStockLevel()) {
            throw new BadRequestException("INVALID_STOCK_LEVEL", "Tồn kho tối thiểu không được lớn hơn tồn kho tối đa");
        }

        Category category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new NotFoundException("CATEGORY_NOT_FOUND", "Không tìm thấy danh mục với ID: " + request.getCategoryId()));

        Supplier supplier = null;
        if (request.getSupplierId() != null) {
            supplier = supplierRepository.findById(request.getSupplierId())
                    .orElseThrow(() -> new NotFoundException("SUPPLIER_NOT_FOUND", "Không tìm thấy nhà cung cấp với ID: " + request.getSupplierId()));
        }

        Product product = new Product();
        product.setSku(request.getSku().toUpperCase().trim());
        product.setBarcode(request.getBarcode().trim());
        product.setName(request.getName().trim());
        product.setDescription(request.getDescription() != null ? request.getDescription().trim() : null);
        product.setCategory(category);
        product.setSupplier(supplier);
        product.setUnit(request.getUnit() != null ? request.getUnit().trim() : "Cái");
        product.setPurchasePrice(request.getPurchasePrice());
        product.setSellingPrice(request.getSellingPrice());
        if (request.getMinStockLevel() != null) {
            product.setMinStockLevel(request.getMinStockLevel());
        }
        if (request.getMaxStockLevel() != null) {
            product.setMaxStockLevel(request.getMaxStockLevel());
        }
        if (request.getStatus() != null && !request.getStatus().isBlank()) {
            product.setStatus(request.getStatus().toUpperCase());
        }

        Product saved = productRepository.save(product);
        return ProductResponse.from(saved);
    }

    public ProductResponse updateProduct(Long id, ProductRequest request) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("PRODUCT_NOT_FOUND", "Không tìm thấy sản phẩm với ID: " + id));

        if (productRepository.existsBySkuAndIdNot(request.getSku(), id)) {
            throw new ConflictException("DUPLICATE_SKU", "Mã SKU đã tồn tại ở sản phẩm khác: " + request.getSku());
        }
        if (productRepository.existsByBarcodeAndIdNot(request.getBarcode(), id)) {
            throw new ConflictException("DUPLICATE_BARCODE", "Mã barcode đã tồn tại ở sản phẩm khác: " + request.getBarcode());
        }
        if (request.getMinStockLevel() != null && request.getMaxStockLevel() != null
                && request.getMinStockLevel() > request.getMaxStockLevel()) {
            throw new BadRequestException("INVALID_STOCK_LEVEL", "Tồn kho tối thiểu không được lớn hơn tồn kho tối đa");
        }

        Category category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new NotFoundException("CATEGORY_NOT_FOUND", "Không tìm thấy danh mục với ID: " + request.getCategoryId()));

        Supplier supplier = null;
        if (request.getSupplierId() != null) {
            supplier = supplierRepository.findById(request.getSupplierId())
                    .orElseThrow(() -> new NotFoundException("SUPPLIER_NOT_FOUND", "Không tìm thấy nhà cung cấp với ID: " + request.getSupplierId()));
        }

        product.setSku(request.getSku().toUpperCase().trim());
        product.setBarcode(request.getBarcode().trim());
        product.setName(request.getName().trim());
        product.setDescription(request.getDescription() != null ? request.getDescription().trim() : null);
        product.setCategory(category);
        product.setSupplier(supplier);
        product.setUnit(request.getUnit() != null ? request.getUnit().trim() : "Cái");
        product.setPurchasePrice(request.getPurchasePrice());
        product.setSellingPrice(request.getSellingPrice());
        if (request.getMinStockLevel() != null) {
            product.setMinStockLevel(request.getMinStockLevel());
        }
        if (request.getMaxStockLevel() != null) {
            product.setMaxStockLevel(request.getMaxStockLevel());
        }
        if (request.getStatus() != null && !request.getStatus().isBlank()) {
            product.setStatus(request.getStatus().toUpperCase());
        }

        Product updated = productRepository.save(product);
        return ProductResponse.from(updated);
    }

    public void deleteProduct(Long id) {
        if (!productRepository.existsById(id)) {
            throw new NotFoundException("PRODUCT_NOT_FOUND", "Không tìm thấy sản phẩm với ID: " + id);
        }
        // Tích hợp Master Data - Inventory: còn hàng tồn thì không được xóa (bản ghi tồn = 0 sẽ cascade theo FK).
        if (inventoryRepository.existsByProductIdAndCurrentStockGreaterThan(id, 0)) {
            throw new ConflictException("PRODUCT_HAS_STOCK",
                    "Không thể xóa sản phẩm còn hàng tồn kho. Hãy chuyển sản phẩm sang INACTIVE thay vì xóa");
        }
        productRepository.deleteById(id);
    }
}

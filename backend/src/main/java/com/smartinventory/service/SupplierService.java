package com.smartinventory.service;

import com.smartinventory.dto.SupplierRequest;
import com.smartinventory.dto.SupplierResponse;
import com.smartinventory.exception.ConflictException;
import com.smartinventory.exception.NotFoundException;
import com.smartinventory.model.Supplier;
import com.smartinventory.repository.SupplierRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class SupplierService {

    private final SupplierRepository supplierRepository;

    public SupplierService(SupplierRepository supplierRepository) {
        this.supplierRepository = supplierRepository;
    }

    @Transactional(readOnly = true)
    public List<SupplierResponse> getAllSuppliers() {
        return supplierRepository.findAll().stream()
                .map(SupplierResponse::from)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public SupplierResponse getSupplierById(Long id) {
        Supplier supplier = supplierRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("SUPPLIER_NOT_FOUND", "Không tìm thấy nhà cung cấp với ID: " + id));
        return SupplierResponse.from(supplier);
    }

    public SupplierResponse createSupplier(SupplierRequest request) {
        if (supplierRepository.existsByCode(request.getCode())) {
            throw new ConflictException("DUPLICATE_SUPPLIER_CODE", "Mã nhà cung cấp đã tồn tại: " + request.getCode());
        }

        Supplier supplier = new Supplier();
        supplier.setCode(request.getCode().toUpperCase().trim());
        supplier.setName(request.getName().trim());
        supplier.setContactName(request.getContactName() != null ? request.getContactName().trim() : null);
        supplier.setEmail(request.getEmail() != null ? request.getEmail().trim() : null);
        supplier.setPhone(request.getPhone() != null ? request.getPhone().trim() : null);
        supplier.setAddress(request.getAddress() != null ? request.getAddress().trim() : null);
        if (request.getLeadTimeDays() != null) {
            supplier.setLeadTimeDays(request.getLeadTimeDays());
        }
        if (request.getReliabilityScore() != null) {
            supplier.setReliabilityScore(request.getReliabilityScore());
        }
        if (request.getStatus() != null && !request.getStatus().isBlank()) {
            supplier.setStatus(request.getStatus().toUpperCase());
        }

        Supplier saved = supplierRepository.save(supplier);
        return SupplierResponse.from(saved);
    }

    public SupplierResponse updateSupplier(Long id, SupplierRequest request) {
        Supplier supplier = supplierRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("SUPPLIER_NOT_FOUND", "Không tìm thấy nhà cung cấp với ID: " + id));

        if (supplierRepository.existsByCodeAndIdNot(request.getCode(), id)) {
            throw new ConflictException("DUPLICATE_SUPPLIER_CODE", "Mã nhà cung cấp đã tồn tại ở bản ghi khác: " + request.getCode());
        }

        supplier.setCode(request.getCode().toUpperCase().trim());
        supplier.setName(request.getName().trim());
        supplier.setContactName(request.getContactName() != null ? request.getContactName().trim() : null);
        supplier.setEmail(request.getEmail() != null ? request.getEmail().trim() : null);
        supplier.setPhone(request.getPhone() != null ? request.getPhone().trim() : null);
        supplier.setAddress(request.getAddress() != null ? request.getAddress().trim() : null);
        if (request.getLeadTimeDays() != null) {
            supplier.setLeadTimeDays(request.getLeadTimeDays());
        }
        if (request.getReliabilityScore() != null) {
            supplier.setReliabilityScore(request.getReliabilityScore());
        }
        if (request.getStatus() != null && !request.getStatus().isBlank()) {
            supplier.setStatus(request.getStatus().toUpperCase());
        }

        Supplier updated = supplierRepository.save(supplier);
        return SupplierResponse.from(updated);
    }

    public void deleteSupplier(Long id) {
        if (!supplierRepository.existsById(id)) {
            throw new NotFoundException("SUPPLIER_NOT_FOUND", "Không tìm thấy nhà cung cấp với ID: " + id);
        }
        supplierRepository.deleteById(id);
    }
}

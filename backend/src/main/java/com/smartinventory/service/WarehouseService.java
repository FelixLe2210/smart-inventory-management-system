package com.smartinventory.service;

import com.smartinventory.dto.WarehouseRequest;
import com.smartinventory.dto.WarehouseResponse;
import com.smartinventory.exception.ConflictException;
import com.smartinventory.exception.NotFoundException;
import com.smartinventory.model.Warehouse;
import com.smartinventory.repository.WarehouseRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;

@Service
@Transactional
public class WarehouseService {

    private final WarehouseRepository warehouseRepository;

    public WarehouseService(WarehouseRepository warehouseRepository) {
        this.warehouseRepository = warehouseRepository;
    }

    @Transactional(readOnly = true)
    public List<WarehouseResponse> getAllWarehouses() {
        return warehouseRepository.findAll().stream()
                .map(WarehouseResponse::from)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public WarehouseResponse getWarehouseById(Long id) {
        Warehouse warehouse = warehouseRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("WAREHOUSE_NOT_FOUND", "Không tìm thấy kho với ID: " + id));
        return WarehouseResponse.from(warehouse);
    }

    public WarehouseResponse createWarehouse(WarehouseRequest request) {
        if (warehouseRepository.existsByCode(request.getCode())) {
            throw new ConflictException("DUPLICATE_WAREHOUSE_CODE", "Mã kho đã tồn tại: " + request.getCode());
        }

        Warehouse warehouse = new Warehouse();
        warehouse.setCode(request.getCode().toUpperCase().trim());
        warehouse.setName(request.getName().trim());
        warehouse.setAddress(request.getAddress().trim());
        warehouse.setPhone(request.getPhone() != null ? request.getPhone().trim() : null);
        applyExtendedDetails(warehouse, request);
        if (request.getStatus() != null && !request.getStatus().isBlank()) {
            warehouse.setStatus(request.getStatus().toUpperCase());
        }

        Warehouse saved = warehouseRepository.save(warehouse);
        return WarehouseResponse.from(saved);
    }

    public WarehouseResponse updateWarehouse(Long id, WarehouseRequest request) {
        Warehouse warehouse = warehouseRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("WAREHOUSE_NOT_FOUND", "Không tìm thấy kho với ID: " + id));

        if (warehouseRepository.existsByCodeAndIdNot(request.getCode(), id)) {
            throw new ConflictException("DUPLICATE_WAREHOUSE_CODE", "Mã kho đã tồn tại ở chi nhánh khác: " + request.getCode());
        }

        warehouse.setCode(request.getCode().toUpperCase().trim());
        warehouse.setName(request.getName().trim());
        warehouse.setAddress(request.getAddress().trim());
        warehouse.setPhone(request.getPhone() != null ? request.getPhone().trim() : null);
        applyExtendedDetails(warehouse, request);
        if (request.getStatus() != null && !request.getStatus().isBlank()) {
            warehouse.setStatus(request.getStatus().toUpperCase());
        }

        Warehouse updated = warehouseRepository.save(warehouse);
        return WarehouseResponse.from(updated);
    }

    private void applyExtendedDetails(Warehouse warehouse, WarehouseRequest request) {
        warehouse.setDescription(trimToNull(request.getDescription()));
        warehouse.setRegion(request.getRegion().toLowerCase(Locale.ROOT));
        warehouse.setType(request.getType().toLowerCase(Locale.ROOT));
        warehouse.setArea(request.getArea());
        warehouse.setCapacity(request.getCapacity() != null ? request.getCapacity() : 0);
        warehouse.setHeight(request.getHeight());
        warehouse.setDocks(request.getDocks());
        warehouse.setFloorLoad(request.getFloorLoad());
        warehouse.setManagerName(trimToNull(request.getManagerName()));
        warehouse.setManagerEmail(trimToNull(request.getManagerEmail()));
        warehouse.setSecurity(trimToNull(request.getSecurity()));
        warehouse.setBarcodeEnabled(Boolean.TRUE.equals(request.getBarcodeEnabled()));
    }

    private String trimToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    public void deleteWarehouse(Long id) {
        if (!warehouseRepository.existsById(id)) {
            throw new NotFoundException("WAREHOUSE_NOT_FOUND", "Không tìm thấy kho với ID: " + id);
        }
        warehouseRepository.deleteById(id);
    }

    public WarehouseResponse updateStatus(Long id, String status) {
        Warehouse warehouse = warehouseRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("WAREHOUSE_NOT_FOUND", "Không tìm thấy kho với ID: " + id));

        warehouse.setStatus(status.toUpperCase());
        Warehouse updated = warehouseRepository.save(warehouse);
        return WarehouseResponse.from(updated);
    }
}

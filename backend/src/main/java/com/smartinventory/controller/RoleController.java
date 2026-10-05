package com.smartinventory.controller;

import com.smartinventory.dto.ApiResponse;
import com.smartinventory.dto.RoleResponse;
import com.smartinventory.model.Role;
import com.smartinventory.repository.RoleRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.stream.Collectors;

//để tạo một API lấy toàn bộ danh sách vai trò (roles) từ cơ sở dữ liệu và trả về cho Frontend dưới dạng danh sách DTO.( mục đích chính của file)
@RestController
@RequestMapping("/api/roles") //Mở đường dẫn API tại lcal host 8080 
public class RoleController {

    private final RoleRepository roleRepository;

    public RoleController(RoleRepository roleRepository) {
        this.roleRepository = roleRepository;
    }

    @GetMapping // Lắng nghe yêu cầu GET từ Client. Khi Frontend gọi đến
    public ApiResponse<List<RoleResponse>> getRoles() {
        List<RoleResponse> roles = roleRepository.findAll().stream()
            .map(this::toResponse)
                .collect(Collectors.toList());
        return ApiResponse.success(roles);
    }

    private RoleResponse toResponse(Role role) {
        return new RoleResponse(
                role.getRoleId().longValue(),
                role.getRoleName(),
                role.getDescription()
        );
    }
}
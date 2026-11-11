package com.smartinventory.controller;

import com.smartinventory.dto.ApiResponse;
import com.smartinventory.dto.UserResponse;
import com.smartinventory.dto.UserRoleRequest;
import com.smartinventory.dto.UserStatusRequest;
import com.smartinventory.service.UserService;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** Quản lý tài khoản (chỉ ADMIN): xem danh sách, đổi vai trò, bật/khóa. */
@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping
    public ApiResponse<List<UserResponse>> getAllUsers() {
        return ApiResponse.success(userService.getAllUsers());
    }

    @PatchMapping("/{id}/role")
    public ApiResponse<UserResponse> changeRole(@PathVariable Long id,
                                                @Valid @RequestBody UserRoleRequest request,
                                                Authentication authentication) {
        return ApiResponse.success(userService.changeRole(id, request.role(), authentication.getName()));
    }

    @PatchMapping("/{id}/status")
    public ApiResponse<UserResponse> changeStatus(@PathVariable Long id,
                                                  @Valid @RequestBody UserStatusRequest request,
                                                  Authentication authentication) {
        return ApiResponse.success(userService.changeStatus(id, request.active(), authentication.getName()));
    }
}

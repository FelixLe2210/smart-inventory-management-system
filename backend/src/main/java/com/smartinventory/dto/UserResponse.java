package com.smartinventory.dto;

import com.smartinventory.model.Role;
import com.smartinventory.model.User;

import java.util.List;

/** Thông tin một tài khoản dành cho màn hình quản trị (không bao gồm mật khẩu). */
public record UserResponse(
        Long id,
        String username,
        String email,
        String phone,
        boolean active,
        List<String> roles
) {

    public static UserResponse from(User user) {
        List<String> roleNames = user.getRoles().stream()
                .map(Role::getName)
                .sorted()
                .toList();
        return new UserResponse(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getPhone(),
                !Boolean.FALSE.equals(user.getActive()),
                roleNames);
    }
}

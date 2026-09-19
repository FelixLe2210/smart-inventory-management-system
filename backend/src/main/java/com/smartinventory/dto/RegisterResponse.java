package com.smartinventory.dto;

public record RegisterResponse(
        int userId,
        String username,
        String fullName,
        String email,
        String role
) {
}
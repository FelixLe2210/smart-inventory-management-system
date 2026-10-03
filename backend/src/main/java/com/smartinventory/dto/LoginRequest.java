package com.smartinventory.dto;

import jakarta.validation.constraints.NotBlank;

/** Login by username or email. */
public record LoginRequest(
        @NotBlank(message = "Username or email is required")
        String usernameOrEmail,
        @NotBlank(message = "Password is required")
        String password
) {
}
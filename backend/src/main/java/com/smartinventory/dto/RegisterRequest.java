package com.smartinventory.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Body of {@code POST /api/auth/register}. */
public record RegisterRequest(

        @NotBlank(message = "Username is required")
        @Pattern(regexp = "^[A-Za-z0-9._-]{3,50}$",
                message = "Username must be 3-50 characters: letters, digits, dot, underscore or hyphen")
        String username,

        @NotBlank(message = "Email is required")
        @Email(message = "Email is not valid")
        @Size(max = 255, message = "Email is too long")
        String email,

        @NotBlank(message = "Password is required")
        @Size(min = 8, max = 72, message = "Password must be 8-72 characters")
        String password
) {
}

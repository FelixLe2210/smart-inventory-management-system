package com.smartinventory.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Body of {@code POST /api/auth/google} and {@code POST /api/auth/facebook}: the provider's access token. */
public record SocialLoginRequest(

        @NotBlank(message = "Token is required")
        @Size(max = 4096, message = "Token is too long")
        String token
) {
}

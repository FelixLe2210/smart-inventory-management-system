package com.smartinventory.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Body of {@code POST /api/auth/phone/verify}. */
public record PhoneVerifyRequest(

        @NotBlank(message = "Phone number is required")
        @Size(max = 32, message = "Phone number is too long")
        String phone,

        @NotBlank(message = "Code is required")
        @Pattern(regexp = "^\\d{6}$", message = "Code must be 6 digits")
        String code
) {
}

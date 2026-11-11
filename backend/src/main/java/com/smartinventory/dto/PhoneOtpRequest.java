package com.smartinventory.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Body of {@code POST /api/auth/phone/request-otp}. */
public record PhoneOtpRequest(

        @NotBlank(message = "Phone number is required")
        @Size(max = 32, message = "Phone number is too long")
        String phone
) {
}

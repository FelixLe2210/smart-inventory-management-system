package com.smartinventory.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * Result of requesting a phone code. {@code devCode} is only present when the server runs with
 * {@code app.auth.phone.dev-mode=true} (no SMS gateway): it lets sign-in continue in a local setup without a real SMS.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record OtpSentResponse(
        String phone,
        int expiresInSeconds,
        int resendAfterSeconds,
        String devCode
) {
}

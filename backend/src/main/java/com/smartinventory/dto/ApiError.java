package com.smartinventory.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.List;

/**
 * Machine-readable error payload embedded in {@link ApiResponse}.
 *
 * <p>{@code code} is a stable, upper-snake-case identifier the frontend can branch on
 * (e.g. show a specific message for "INVALID_CREDENTIALS" vs a generic one for
 * "VALIDATION_ERROR"). {@code message} is a human-readable summary safe to display
 * directly. {@code details} carries field-level validation messages when applicable
 * and is omitted otherwise.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ApiError(
        String code,
        String message,
        List<String> details
) {

    public ApiError(String code, String message) {
        this(code, message, null);
    }
}

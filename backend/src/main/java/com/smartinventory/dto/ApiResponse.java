package com.smartinventory.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.Instant;

/**
 * Standard response envelope for every REST endpoint in this project.
 *
 * <p>Success:
 * <pre>
 * {
 *   "success": true,
 *   "data": { ... },
 *   "error": null,
 *   "timestamp": "2026-09-14T10:15:30Z"
 * }
 * </pre>
 *
 * <p>Failure:
 * <pre>
 * {
 *   "success": false,
 *   "data": null,
 *   "error": { "code": "UNAUTHORIZED", "message": "Invalid username or password", "details": [] },
 *   "timestamp": "2026-09-14T10:15:30Z"
 * }
 * </pre>
 *
 * See {@code docs/api/API_CONVENTIONS.md} for the full contract this project follows.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ApiResponse<T>(
        boolean success,
        T data,
        ApiError error,
        Instant timestamp
) {

    public static <T> ApiResponse<T> success(T data) {
        return new ApiResponse<>(true, data, null, Instant.now());
    }

    public static <T> ApiResponse<T> error(ApiError error) {
        return new ApiResponse<>(false, null, error, Instant.now());
    }
}

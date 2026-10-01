package com.smartinventory.exception;

/**
 * Thrown when the client sent a request that is well-formed JSON but semantically
 * invalid (e.g. malformed field beyond what bean validation already catches).
 * Mapped to HTTP 400 by {@link GlobalExceptionHandler}.
 */
public class BadRequestException extends RuntimeException {

    private final String code;

    public BadRequestException(String code, String message) {
        super(message);
        this.code = code;
    }

    public BadRequestException(String message) {
        this("BAD_REQUEST", message);
    }

    public String getCode() {
        return code;
    }
}

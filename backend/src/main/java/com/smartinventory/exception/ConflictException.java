package com.smartinventory.exception;

/**
 * Thrown when a resource already exists or causes a unique constraint violation (HTTP 409).
 * Caught by {@link GlobalExceptionHandler#handleConflict}.
 */
public class ConflictException extends RuntimeException {

    private final String code;

    public ConflictException(String code, String message) {
        super(message);
        this.code = code;
    }

    public ConflictException(String message) {
        this("CONFLICT", message);
    }

    public String getCode() {
        return code;
    }
}

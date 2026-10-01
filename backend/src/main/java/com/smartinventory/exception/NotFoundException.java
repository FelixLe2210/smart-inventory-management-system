package com.smartinventory.exception;

/**
 * Thrown when a requested resource does not exist (HTTP 404).
 * Caught by {@link GlobalExceptionHandler#handleNotFound}.
 */
public class NotFoundException extends RuntimeException {

    private final String code;

    public NotFoundException(String code, String message) {
        super(message);
        this.code = code;
    }

    /** Convenience factory: {@code NotFoundException.of("WAREHOUSE_NOT_FOUND", id)} */
    public static NotFoundException of(String code, Object id) {
        return new NotFoundException(code, "Resource not found with id: " + id);
    }

    public String getCode() { return code; }
}

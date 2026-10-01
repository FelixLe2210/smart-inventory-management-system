package com.smartinventory.exception;

/**
 * Thrown when authentication fails (unknown user, wrong password, inactive account).
 * Mapped to HTTP 401 by {@link GlobalExceptionHandler}.
 *
 * <p>Intentionally does not distinguish "user not found" from "wrong password" in the
 * message shown to the client — that distinction must never leak to callers, since it
 * would let an attacker enumerate valid usernames.
 */
public class UnauthorizedException extends RuntimeException {

    private final String code;

    public UnauthorizedException(String code, String message) {
        super(message);
        this.code = code;
    }

    public UnauthorizedException(String message) {
        this("UNAUTHORIZED", message);
    }

    public String getCode() {
        return code;
    }
}

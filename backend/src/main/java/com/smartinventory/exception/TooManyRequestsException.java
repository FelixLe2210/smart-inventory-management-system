package com.smartinventory.exception;

/** Quá nhiều lần thử (ví dụ đăng nhập sai liên tiếp). Trả về HTTP 429 kèm số giây phải chờ. */
public class TooManyRequestsException extends RuntimeException {

    private final String code;
    private final long retryAfterSeconds;

    public TooManyRequestsException(String code, String message, long retryAfterSeconds) {
        super(message);
        this.code = code;
        this.retryAfterSeconds = retryAfterSeconds;
    }

    public String getCode() {
        return code;
    }

    public long getRetryAfterSeconds() {
        return retryAfterSeconds;
    }
}

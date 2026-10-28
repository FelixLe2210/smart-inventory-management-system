package com.smartinventory.exception;

import com.smartinventory.dto.ApiError;
import com.smartinventory.dto.ApiResponse;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.PessimisticLockingFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import java.util.List;

/**
 * Converts every exception thrown by a controller into the standard
 * {@link ApiResponse} envelope, so the frontend only ever has to deal with
 * one response shape (see {@code docs/api/API_CONVENTIONS.md}).
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    /** Bean Validation failures on @Valid @RequestBody DTOs (e.g. @NotBlank). */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> handleValidation(MethodArgumentNotValidException ex) {
        List<String> details = ex.getBindingResult().getFieldErrors().stream()
                .map(this::formatFieldError)
                .toList();

        ApiError error = new ApiError("VALIDATION_ERROR", "One or more fields are invalid.", details);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ApiResponse.error(error));
    }

    /** Malformed JSON body, wrong type for a field, empty body where one is required, etc. */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiResponse<Void>> handleUnreadableBody(HttpMessageNotReadableException ex) {
        ApiError error = new ApiError("MALFORMED_REQUEST", "Request body is missing or not valid JSON.");
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ApiResponse.error(error));
    }

    /** Wrong type in a path variable / query param, e.g. /api/users/abc instead of a numeric id. */
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ApiResponse<Void>> handleTypeMismatch(MethodArgumentTypeMismatchException ex) {
        String message = "Parameter '" + ex.getName() + "' has an invalid value.";
        ApiError error = new ApiError("BAD_REQUEST", message);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ApiResponse.error(error));
    }

    @ExceptionHandler(BadRequestException.class)
    public ResponseEntity<ApiResponse<Void>> handleBadRequest(BadRequestException ex) {
        ApiError error = new ApiError(ex.getCode(), ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ApiResponse.error(error));
    }

    @ExceptionHandler(UnauthorizedException.class)
    public ResponseEntity<ApiResponse<Void>> handleUnauthorized(UnauthorizedException ex) {
        ApiError error = new ApiError(ex.getCode(), ex.getMessage());
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ApiResponse.error(error));
    }

    @ExceptionHandler(AiServiceException.class)
    public ResponseEntity<ApiResponse<Void>> handleAiServiceFailure(AiServiceException ex) {
        ApiError error = new ApiError(ex.getCode(), ex.getMessage());
        return ResponseEntity.status(ex.getStatus()).body(ApiResponse.error(error));
    }

    /** Resource not found: warehouse, product, category, supplier, etc. */
    @ExceptionHandler(NotFoundException.class)
    public ResponseEntity<ApiResponse<Void>> handleNotFound(NotFoundException ex) {
        ApiError error = new ApiError(ex.getCode(), ex.getMessage());
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.error(error));
    }

    /** Conflict: duplicate unique constraints (e.g. duplicate code/SKU). */
    @ExceptionHandler(ConflictException.class)
    public ResponseEntity<ApiResponse<Void>> handleConflict(ConflictException ex) {
        ApiError error = new ApiError(ex.getCode(), ex.getMessage());
        return ResponseEntity.status(HttpStatus.CONFLICT).body(ApiResponse.error(error));
    }

    /**
     * Two transactions touching the same inventory row at the same moment (lock timeout,
     * deadlock victim, failure to acquire a row lock). The request is safe to retry, so it is
     * a 409 with a stable code the frontend recognises, instead of an opaque 500.
     */
    @ExceptionHandler(PessimisticLockingFailureException.class)
    public ResponseEntity<ApiResponse<Void>> handleLockFailure(PessimisticLockingFailureException ex) {
        ApiError error = new ApiError("TRANSACTION_CONFLICT",
                "Kho đang xử lý một giao dịch khác cùng lúc. Vui lòng thử lại sau vài giây.");
        return ResponseEntity.status(HttpStatus.CONFLICT).body(ApiResponse.error(error));
    }

    /**
     * The database rejected the write: a CHECK constraint (e.g. stock below zero), a FK that
     * still references the row (deleting a product/warehouse that has stock transactions),
     * or a unique key hit by a concurrent insert. The raw SQL message is deliberately not
     * returned to the client.
     */
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiResponse<Void>> handleDataIntegrity(DataIntegrityViolationException ex) {
        ApiError error = new ApiError("DATA_INTEGRITY_VIOLATION",
                "Thao tác vi phạm ràng buộc dữ liệu (ví dụ tồn kho âm hoặc dữ liệu đang được tham chiếu). "
                        + "Vui lòng tải lại dữ liệu và kiểm tra lại.");
        return ResponseEntity.status(HttpStatus.CONFLICT).body(ApiResponse.error(error));
    }

    /** Safety net so an unexpected bug never leaks a stack trace to the client. */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleUnexpected(Exception ex) {
        ApiError error = new ApiError("INTERNAL_ERROR", "Something went wrong. Please try again later.");
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ApiResponse.error(error));
    }

    private String formatFieldError(FieldError fieldError) {
        return fieldError.getField() + ": " + fieldError.getDefaultMessage();
    }
}

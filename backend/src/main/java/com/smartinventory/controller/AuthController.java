package com.smartinventory.controller;

import com.smartinventory.dto.ApiResponse;
import com.smartinventory.dto.LoginRequest;
import com.smartinventory.dto.LoginResponse;
import com.smartinventory.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Authentication endpoints.
 *
 * <p>See {@code docs/api/API_CONVENTIONS.md} for the response envelope and
 * {@code docs/api/AUTH_API_TESTING.md} for ready-to-run Postman/curl examples.
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    /**
     * POST /api/auth/login
     * 200 -> ApiResponse&lt;LoginResponse&gt; on success.
     * 400 -> ApiResponse&lt;Void&gt; if usernameOrEmail/password are missing or blank.
     * 401 -> ApiResponse&lt;Void&gt; if credentials are wrong or the account is disabled.
     */
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<LoginResponse>> login(@Valid @RequestBody LoginRequest request) {
        LoginResponse response = authService.login(request);
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}

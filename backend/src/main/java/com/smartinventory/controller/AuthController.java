package com.smartinventory.controller;

 sangle
import com.smartinventory.dto.RegisterRequest;
import com.smartinventory.dto.RegisterResponse;

import com.smartinventory.dto.ApiResponse;
 master
import com.smartinventory.dto.LoginRequest;
import com.smartinventory.dto.LoginResponse;
import com.smartinventory.service.AuthService;
import jakarta.validation.Valid;
sangle
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.security.core.Authentication;

import java.util.Map;


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
master
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

 sangle
    @PostMapping("/register")
    public ResponseEntity<RegisterResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.register(request));
    }

    @PostMapping("/login")
    public LoginResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    @GetMapping("/me")
    public Map<String, Object> currentUser(Authentication authentication) {
        return Map.of(
                "username", authentication.getName(),
                "authorities", authentication.getAuthorities()
        );
    }
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
master

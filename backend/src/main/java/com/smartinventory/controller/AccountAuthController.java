package com.smartinventory.controller;

import com.smartinventory.dto.ApiResponse;
import com.smartinventory.dto.AuthProvidersResponse;
import com.smartinventory.dto.LoginResponse;
import com.smartinventory.dto.OtpSentResponse;
import com.smartinventory.dto.PhoneOtpRequest;
import com.smartinventory.dto.PhoneVerifyRequest;
import com.smartinventory.dto.RegisterRequest;
import com.smartinventory.dto.SocialLoginRequest;
import com.smartinventory.security.social.FacebookTokenVerifier;
import com.smartinventory.security.social.GoogleTokenVerifier;
import com.smartinventory.service.AccountAuthService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Public account endpoints (all under {@code /api/auth}, no token needed):
 * register, Google, Facebook and phone-code sign-in, plus the list of methods this server offers.
 * Password login stays in {@link AuthController}.
 */
@RestController
@RequestMapping("/api/auth")
public class AccountAuthController {

    private final AccountAuthService accountAuthService;

    public AccountAuthController(AccountAuthService accountAuthService) {
        this.accountAuthService = accountAuthService;
    }

    /** GET /api/auth/providers - which sign-in methods are available (and their public ids). */
    @GetMapping("/providers")
    public ResponseEntity<ApiResponse<AuthProvidersResponse>> providers() {
        return ResponseEntity.ok(ApiResponse.success(accountAuthService.providers()));
    }

    /** POST /api/auth/register - 201 with a signed-in session; 409 if username/email are taken. */
    @PostMapping("/register")
    public ResponseEntity<ApiResponse<LoginResponse>> register(@Valid @RequestBody RegisterRequest request) {
        LoginResponse response = accountAuthService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response));
    }

    /** POST /api/auth/google - body: Google access token from Google Identity Services. */
    @PostMapping("/google")
    public ResponseEntity<ApiResponse<LoginResponse>> google(@Valid @RequestBody SocialLoginRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                accountAuthService.loginWithSocial(GoogleTokenVerifier.PROVIDER, request.token())));
    }

    /** POST /api/auth/facebook - body: Facebook user access token from the Facebook SDK. */
    @PostMapping("/facebook")
    public ResponseEntity<ApiResponse<LoginResponse>> facebook(@Valid @RequestBody SocialLoginRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                accountAuthService.loginWithSocial(FacebookTokenVerifier.PROVIDER, request.token())));
    }

    /** POST /api/auth/phone/request-otp - sends a 6-digit code to the number. */
    @PostMapping("/phone/request-otp")
    public ResponseEntity<ApiResponse<OtpSentResponse>> requestOtp(@Valid @RequestBody PhoneOtpRequest request) {
        return ResponseEntity.ok(ApiResponse.success(accountAuthService.requestPhoneOtp(request.phone())));
    }

    /** POST /api/auth/phone/verify - checks the code; signs in or creates the account for the number. */
    @PostMapping("/phone/verify")
    public ResponseEntity<ApiResponse<LoginResponse>> verifyOtp(@Valid @RequestBody PhoneVerifyRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                accountAuthService.loginWithPhone(request.phone(), request.code())));
    }
}

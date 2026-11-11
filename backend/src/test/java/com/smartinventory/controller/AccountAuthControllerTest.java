package com.smartinventory.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartinventory.dto.AuthProvidersResponse;
import com.smartinventory.dto.LoginResponse;
import com.smartinventory.dto.OtpSentResponse;
import com.smartinventory.dto.RegisterRequest;
import com.smartinventory.exception.ConflictException;
import com.smartinventory.exception.UnauthorizedException;
import com.smartinventory.service.AccountAuthService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AccountAuthController.class)
@AutoConfigureMockMvc(addFilters = false)
class AccountAuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private AccountAuthService accountAuthService;

    private String json(Object body) throws Exception {
        return objectMapper.writeValueAsString(body);
    }

    private LoginResponse sampleLogin() {
        return new LoginResponse(5L, "new.user", "new.user@example.com", List.of("STAFF"), "jwt-token");
    }

    @Test
    void providersReturnsConfiguredMethods() throws Exception {
        when(accountAuthService.providers()).thenReturn(new AuthProvidersResponse("gid", null, true, true));

        mockMvc.perform(get("/api/auth/providers"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.googleClientId").value("gid"))
                .andExpect(jsonPath("$.data.phoneEnabled").value(true))
                .andExpect(jsonPath("$.data.registrationEnabled").value(true));
    }

    @Test
    void registerReturns201WithSession() throws Exception {
        when(accountAuthService.register(any(RegisterRequest.class))).thenReturn(sampleLogin());

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("username", "new.user", "email", "new.user@example.com", "password", "Passw0rd!"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.accessToken").value("jwt-token"))
                .andExpect(jsonPath("$.data.roles[0]").value("STAFF"));
    }

    @Test
    void registerWithInvalidFieldsReturns400() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("username", "a b", "email", "not-an-email", "password", "short"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"));
    }

    @Test
    void registerWithTakenUsernameReturns409() throws Exception {
        when(accountAuthService.register(any(RegisterRequest.class)))
                .thenThrow(new ConflictException("USERNAME_TAKEN", "This username is already taken."));

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("username", "taken", "email", "t@example.com", "password", "Passw0rd!"))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("USERNAME_TAKEN"));
    }

    @Test
    void googleLoginReturnsSession() throws Exception {
        when(accountAuthService.loginWithSocial("GOOGLE", "access-token")).thenReturn(sampleLogin());

        mockMvc.perform(post("/api/auth/google")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("token", "access-token"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.username").value("new.user"));
    }

    @Test
    void facebookLoginWithRejectedTokenReturns401() throws Exception {
        when(accountAuthService.loginWithSocial("FACEBOOK", "bad"))
                .thenThrow(new UnauthorizedException("SOCIAL_VERIFY_FAILED", "Facebook could not verify this sign-in."));

        mockMvc.perform(post("/api/auth/facebook")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("token", "bad"))))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("SOCIAL_VERIFY_FAILED"));
    }

    @Test
    void socialLoginWithBlankTokenReturns400() throws Exception {
        mockMvc.perform(post("/api/auth/google")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("token", ""))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"));
    }

    @Test
    void requestOtpReturnsDevCodeWhenServiceProvidesIt() throws Exception {
        when(accountAuthService.requestPhoneOtp("0912345678"))
                .thenReturn(new OtpSentResponse("+84912345678", 300, 30, "123456"));

        mockMvc.perform(post("/api/auth/phone/request-otp")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("phone", "0912345678"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.phone").value("+84912345678"))
                .andExpect(jsonPath("$.data.devCode").value("123456"));
    }

    @Test
    void verifyOtpRequiresSixDigits() throws Exception {
        mockMvc.perform(post("/api/auth/phone/verify")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("phone", "0912345678", "code", "12345"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"));
    }

    @Test
    void verifyOtpReturnsSession() throws Exception {
        when(accountAuthService.loginWithPhone("0912345678", "123456")).thenReturn(sampleLogin());

        mockMvc.perform(post("/api/auth/phone/verify")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("phone", "0912345678", "code", "123456"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.accessToken").value("jwt-token"));
    }
}

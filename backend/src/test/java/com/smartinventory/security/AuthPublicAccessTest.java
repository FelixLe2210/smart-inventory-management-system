package com.smartinventory.security;

import com.smartinventory.config.SecurityConfig;
import com.smartinventory.controller.AccountAuthController;
import com.smartinventory.dto.AuthProvidersResponse;
import com.smartinventory.service.AccountAuthService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** The sign-in endpoints must be reachable without a token (nobody is signed in yet). */
@WebMvcTest(controllers = AccountAuthController.class)
@Import({SecurityConfig.class, JwtService.class})
@TestPropertySource(properties = {
        "app.jwt.secret=test-secret-key-that-is-at-least-32-bytes-long",
        "app.jwt.expiration-ms=3600000"
})
class AuthPublicAccessTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private AccountAuthService accountAuthService;

    @Test
    void providersEndpointNeedsNoToken() throws Exception {
        when(accountAuthService.providers()).thenReturn(new AuthProvidersResponse(null, null, true, true));

        mockMvc.perform(get("/api/auth/providers"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }
}

package com.smartinventory.security;

import com.smartinventory.config.SecurityConfig;
import com.smartinventory.controller.AuthController;
import com.smartinventory.controller.RoleController;
import com.smartinventory.dto.LoginRequest;
import com.smartinventory.dto.LoginResponse;
import com.smartinventory.repository.RoleRepository;
import com.smartinventory.service.AuthService;
import com.smartinventory.service.JwtService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(
        controllers = {AuthController.class, RoleController.class},
        properties = {
                "app.jwt.secret=test-secret-that-is-at-least-32-bytes-long",
                "app.jwt.expiration-ms=3600000"
        }
)
@Import({SecurityConfig.class, JwtAuthenticationFilter.class, JwtService.class})
class SecurityConfigTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtService jwtService;

    @MockBean
    private AuthService authService;

        @MockBean
        private RoleRepository roleRepository;

    @Test
    void protectedEndpointRejectsRequestsWithoutToken() throws Exception {
        mockMvc.perform(get("/api/auth/me"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void protectedEndpointAcceptsValidBearerToken() throws Exception {
        String token = jwtService.createToken(1, "staff", List.of("Warehouse Staff"));

        mockMvc.perform(get("/api/auth/me")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.username").value("staff"));
    }

    @Test
    void protectedEndpointRejectsInvalidBearerToken() throws Exception {
        mockMvc.perform(get("/api/auth/me")
                        .header("Authorization", "Bearer invalid-token"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void loginEndpointIsPublic() throws Exception {
        when(authService.login(any(LoginRequest.class))).thenReturn(
                new LoginResponse(1, "staff", "staff@example.com", List.of("Warehouse Staff"), "token")
        );

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"usernameOrEmail\":\"staff\",\"password\":\"Password123\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.username").value("staff"));
    }

        @Test
        void roleEndpointRejectsNonAdminUsers() throws Exception {
                String token = jwtService.createToken(1, "staff", List.of("Warehouse Staff"));

                mockMvc.perform(get("/api/roles")
                                                .header("Authorization", "Bearer " + token))
                                .andExpect(status().isForbidden());
        }

        @Test
        void roleEndpointAllowsAdmins() throws Exception {
                String token = jwtService.createToken(1, "admin", List.of("Admin"));
                when(roleRepository.findAll()).thenReturn(List.of());

                mockMvc.perform(get("/api/roles")
                                                .header("Authorization", "Bearer " + token))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.success").value(true));
        }
}
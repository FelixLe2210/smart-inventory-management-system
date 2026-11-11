package com.smartinventory.security;

import com.smartinventory.config.SecurityConfig;
import com.smartinventory.controller.UserController;
import com.smartinventory.service.UserService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Quản lý tài khoản và vai trò chỉ dành cho ADMIN, kể cả thao tác xem danh sách. */
@WebMvcTest(controllers = UserController.class)
@Import({SecurityConfig.class, JwtService.class})
@TestPropertySource(properties = {
        "app.jwt.secret=test-secret-key-that-is-at-least-32-bytes-long",
        "app.jwt.expiration-ms=3600000"
})
class UserManagementAuthorizationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtService jwtService;

    @MockBean
    private UserService userService;

    private String bearer(String role) {
        return "Bearer " + jwtService.generateToken("user-" + role, List.of(role));
    }

    @Test
    @DisplayName("Chưa đăng nhập: 401")
    void anonymousIsUnauthorized() throws Exception {
        mockMvc.perform(get("/api/users")).andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("MANAGER, STAFF, VIEWER không được xem hay sửa tài khoản (403)")
    void nonAdminsAreForbidden() throws Exception {
        for (String role : List.of("MANAGER", "STAFF", "VIEWER")) {
            mockMvc.perform(get("/api/users").header("Authorization", bearer(role)))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.error.code").value("FORBIDDEN"));
            mockMvc.perform(patch("/api/users/1/role").header("Authorization", bearer(role))
                            .contentType(MediaType.APPLICATION_JSON).content("{\"role\":\"ADMIN\"}"))
                    .andExpect(status().isForbidden());
            mockMvc.perform(patch("/api/users/1/status").header("Authorization", bearer(role))
                            .contentType(MediaType.APPLICATION_JSON).content("{\"active\":false}"))
                    .andExpect(status().isForbidden());
        }
    }

    @Test
    @DisplayName("ADMIN được xem danh sách tài khoản")
    void adminCanList() throws Exception {
        mockMvc.perform(get("/api/users").header("Authorization", bearer("ADMIN")))
                .andExpect(status().isOk());
    }
}

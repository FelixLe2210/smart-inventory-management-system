package com.smartinventory.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartinventory.dto.UserResponse;
import com.smartinventory.exception.ConflictException;
import com.smartinventory.service.UserService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Map;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(UserController.class)
@AutoConfigureMockMvc(addFilters = false)
class UserControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private UserService userService;

    private final TestingAuthenticationToken admin = new TestingAuthenticationToken("admin", null, "ROLE_ADMIN");

    private UserResponse sample(boolean active, String role) {
        return new UserResponse(5L, "lan", "lan@example.com", "+84901234567", active, List.of(role));
    }

    @Test
    @DisplayName("GET /api/users trả danh sách tài khoản")
    void listUsers() throws Exception {
        when(userService.getAllUsers()).thenReturn(List.of(sample(true, "VIEWER")));

        mockMvc.perform(get("/api/users"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].username").value("lan"))
                .andExpect(jsonPath("$.data[0].roles[0]").value("VIEWER"))
                .andExpect(jsonPath("$.data[0].passwordHash").doesNotExist());
    }

    @Test
    @DisplayName("PATCH /api/users/{id}/role đổi vai trò, truyền tên người thực hiện")
    void changeRole() throws Exception {
        when(userService.changeRole(5L, "STAFF", "admin")).thenReturn(sample(true, "STAFF"));

        mockMvc.perform(patch("/api/users/5/role")
                        .principal(admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("role", "STAFF"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.roles[0]").value("STAFF"));

        verify(userService).changeRole(5L, "STAFF", "admin");
    }

    @Test
    @DisplayName("PATCH role với vai trò không hợp lệ trả 400")
    void changeRoleRejectsInvalidRole() throws Exception {
        mockMvc.perform(patch("/api/users/5/role")
                        .principal(admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"role\":\"ROOT\"}"))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(userService);
    }

    @Test
    @DisplayName("PATCH /api/users/{id}/status khóa tài khoản")
    void changeStatus() throws Exception {
        when(userService.changeStatus(5L, false, "admin")).thenReturn(sample(false, "VIEWER"));

        mockMvc.perform(patch("/api/users/5/status")
                        .principal(admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"active\":false}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.active").value(false));
    }

    @Test
    @DisplayName("PATCH status thiếu trường active trả 400")
    void changeStatusRequiresActive() throws Exception {
        mockMvc.perform(patch("/api/users/5/status")
                        .principal(admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Vi phạm quy tắc nghiệp vụ trả 409 kèm mã lỗi")
    void conflictIsReported() throws Exception {
        when(userService.changeStatus(1L, false, "admin"))
                .thenThrow(new ConflictException("LAST_ADMIN", "Hệ thống phải còn ít nhất một quản trị viên."));

        mockMvc.perform(patch("/api/users/1/status")
                        .principal(admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"active\":false}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("LAST_ADMIN"));
    }
}

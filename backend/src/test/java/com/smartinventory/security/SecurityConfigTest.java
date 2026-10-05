package com.smartinventory.security;

import com.smartinventory.config.SecurityConfig;
import com.smartinventory.dto.CategoryResponse;
import com.smartinventory.model.Category;
import com.smartinventory.service.CategoryService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = com.smartinventory.controller.CategoryController.class)
@Import({SecurityConfig.class, JwtService.class})
@TestPropertySource(properties = {
        "app.jwt.secret=test-secret-key-that-is-at-least-32-bytes-long",
        "app.jwt.expiration-ms=3600000"
})
class SecurityConfigTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtService jwtService;

    @MockBean
    private CategoryService categoryService;

    @Test
    void protectedEndpointRejectsRequestWithoutToken() throws Exception {
        mockMvc.perform(get("/api/categories"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("UNAUTHORIZED"));
    }

    @Test
    void protectedEndpointAcceptsValidBearerToken() throws Exception {
        Category category = new Category();
        category.setCode("CAT-TEST");
        category.setName("Test");
        when(categoryService.getAllCategories())
                .thenReturn(List.of(CategoryResponse.from(category)));

        mockMvc.perform(get("/api/categories")
                        .header("Authorization", "Bearer "
                                + jwtService.generateToken("admin", List.of("ADMIN"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].code").value("CAT-TEST"));
    }
}

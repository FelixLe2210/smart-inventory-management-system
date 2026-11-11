package com.smartinventory.security;

import com.smartinventory.config.SecurityConfig;
import com.smartinventory.service.PurchaseOrderService;
import com.smartinventory.service.ReorderService;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Ma trận phân quyền: VIEWER chỉ đọc; STAFF đọc, nhận hàng và vận hành kho; ADMIN/MANAGER được quyết định mua hàng. */
@WebMvcTest(controllers = {
        com.smartinventory.controller.PurchaseOrderController.class,
        com.smartinventory.controller.ReorderController.class
})
@Import({SecurityConfig.class, JwtService.class})
@TestPropertySource(properties = {
        "app.jwt.secret=test-secret-key-that-is-at-least-32-bytes-long",
        "app.jwt.expiration-ms=3600000"
})
class RoleAuthorizationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtService jwtService;

    @MockBean
    private PurchaseOrderService purchaseOrderService;

    @MockBean
    private ReorderService reorderService;

    private String bearer(String role) {
        return "Bearer " + jwtService.generateToken("user-" + role, List.of(role));
    }

    @Test
    @DisplayName("STAFF không được tạo đơn đặt hàng (403 FORBIDDEN)")
    void staffCannotCreatePurchaseOrder() throws Exception {
        mockMvc.perform(post("/api/purchase-orders")
                        .header("Authorization", bearer("STAFF"))
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("FORBIDDEN"));
    }

    @Test
    @DisplayName("STAFF không được gửi đơn hay tạo/chấp nhận đề xuất đặt hàng")
    void staffCannotSendOrDecideReorders() throws Exception {
        mockMvc.perform(post("/api/purchase-orders/1/send").header("Authorization", bearer("STAFF")))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/reorder/recommendations/generate").header("Authorization", bearer("STAFF")))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/reorder/recommendations/1/accept").header("Authorization", bearer("STAFF")))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("STAFF được đọc danh sách đơn đặt hàng")
    void staffCanReadPurchaseOrders() throws Exception {
        mockMvc.perform(get("/api/purchase-orders").header("Authorization", bearer("STAFF")))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("STAFF được nhận hàng: không bị chặn 403 (bị từ chối vì nội dung rỗng thì là 400 hoặc 200)")
    void staffCanReceiveGoods() throws Exception {
        mockMvc.perform(post("/api/purchase-orders/1/receive")
                        .header("Authorization", bearer("STAFF"))
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(result -> {
                    int code = result.getResponse().getStatus();
                    if (code == 401 || code == 403) {
                        throw new AssertionError("STAFF must be allowed to receive goods, got " + code);
                    }
                });
    }

    @Test
    @DisplayName("MANAGER và ADMIN không bị chặn khi gửi đơn")
    void managerAndAdminCanSendOrders() throws Exception {
        for (String role : List.of("MANAGER", "ADMIN")) {
            mockMvc.perform(post("/api/purchase-orders/1/send").header("Authorization", bearer(role)))
                    .andExpect(result -> {
                        int code = result.getResponse().getStatus();
                        if (code == 401 || code == 403) {
                            throw new AssertionError(role + " must be allowed to send orders, got " + code);
                        }
                    });
        }
    }

    @Test
    @DisplayName("VIEWER chỉ được đọc: ghi dữ liệu kho hay nhận hàng đều bị 403")
    void viewerIsReadOnly() throws Exception {
        mockMvc.perform(get("/api/purchase-orders").header("Authorization", bearer("VIEWER")))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/purchase-orders/1/receive").header("Authorization", bearer("VIEWER"))
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/inventory/1/adjust").header("Authorization", bearer("VIEWER"))
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("STAFF không bị chặn khi ghi dữ liệu kho (đường dẫn không có controller trong test này nên là 404)")
    void staffIsNotBlockedFromInventoryWrites() throws Exception {
        mockMvc.perform(post("/api/inventory/1/adjust").header("Authorization", bearer("STAFF"))
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isNotFound());
    }
}

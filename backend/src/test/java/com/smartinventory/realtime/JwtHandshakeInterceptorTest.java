package com.smartinventory.realtime;

import com.smartinventory.security.JwtService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.server.ServletServerHttpRequest;
import org.springframework.http.server.ServletServerHttpResponse;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class JwtHandshakeInterceptorTest {

    private final JwtService jwtService = new JwtService("test-secret-key-that-is-at-least-32-bytes-long", 3_600_000L);
    private final JwtHandshakeInterceptor interceptor = new JwtHandshakeInterceptor(jwtService);

    private boolean handshake(String query, MockHttpServletResponse servletResponse, Map<String, Object> attributes) {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/ws/inventory");
        request.setQueryString(query);
        return interceptor.beforeHandshake(new ServletServerHttpRequest(request),
                new ServletServerHttpResponse(servletResponse), null, attributes);
    }

    @Test
    @DisplayName("Token hợp lệ trong query được chấp nhận")
    void validTokenAccepted() {
        Map<String, Object> attributes = new HashMap<>();
        String token = jwtService.generateToken("admin", List.of("ADMIN"));
        assertTrue(handshake("token=" + token, new MockHttpServletResponse(), attributes));
        assertEquals("admin", attributes.get("username"));
    }

    @Test
    @DisplayName("Thiếu token bị từ chối 401")
    void missingTokenRejected() {
        MockHttpServletResponse response = new MockHttpServletResponse();
        assertFalse(handshake(null, response, new HashMap<>()));
        assertEquals(401, response.getStatus());
    }

    @Test
    @DisplayName("Token sai bị từ chối 401")
    void invalidTokenRejected() {
        MockHttpServletResponse response = new MockHttpServletResponse();
        assertFalse(handshake("token=not-a-jwt", response, new HashMap<>()));
        assertEquals(401, response.getStatus());
    }
}

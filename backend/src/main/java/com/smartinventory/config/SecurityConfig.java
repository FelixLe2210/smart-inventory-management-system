package com.smartinventory.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartinventory.dto.ApiError;
import com.smartinventory.dto.ApiResponse;
import com.smartinventory.security.JwtAuthenticationFilter;
import com.smartinventory.security.JwtService;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import java.io.IOException;

@Configuration
public class SecurityConfig {

    private static final String ADMIN = "ADMIN";
    private static final String MANAGER = "MANAGER";
    private static final String STAFF = "STAFF";
    // VIEWER: vai trò mặc định của tài khoản tự đăng ký, chỉ được xem (xem V9__viewer_role.sql).

    @Bean
    public SecurityFilterChain securityFilterChain(
            HttpSecurity http,
            JwtService jwtService,
            ObjectMapper objectMapper
    ) throws Exception {
        return http
                .csrf(AbstractHttpConfigurer::disable)
                .cors(Customizer.withDefaults())
                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(exceptions -> exceptions
                        .authenticationEntryPoint((request, response, exception) ->
                                writeError(response, objectMapper, HttpStatus.UNAUTHORIZED,
                                        "UNAUTHORIZED", "Authentication is required."))
                        .accessDeniedHandler((request, response, exception) ->
                                writeError(response, objectMapper, HttpStatus.FORBIDDEN,
                                        "FORBIDDEN", "You do not have permission to access this resource.")))
                .authorizeHttpRequests(authorize -> authorize
                        // Đăng nhập, đăng ký, Google/Facebook, mã điện thoại: công khai (tự kiểm tra danh tính bên trong).
                        .requestMatchers("/api/auth/**", "/api/health").permitAll()
                        // WebSocket tự xác thực JWT trong JwtHandshakeInterceptor (trình duyệt không gửi được header).
                        .requestMatchers("/ws/**").permitAll()
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        // Nhận hàng là nghiệp vụ của nhân viên kho: STAFF được phép.
                        .requestMatchers(HttpMethod.POST, "/api/purchase-orders/*/receive")
                                .hasAnyRole(ADMIN, MANAGER, STAFF)
                        // Quản lý tài khoản và vai trò: chỉ ADMIN (kể cả đọc danh sách).
                        .requestMatchers("/api/users/**").hasRole(ADMIN)
                        // Đọc dữ liệu: mọi người dùng đã đăng nhập.
                        .requestMatchers(HttpMethod.GET, "/api/**").authenticated()
                        // Quyết định mua hàng và danh mục gốc: chỉ ADMIN và MANAGER thay đổi.
                        .requestMatchers("/api/purchase-orders/**", "/api/reorder/**",
                                "/api/products/**", "/api/categories/**",
                                "/api/suppliers/**", "/api/warehouses/**")
                                .hasAnyRole(ADMIN, MANAGER)
                        // Chạy dự báo là thao tác đọc (POST chỉ vì phải gửi tham số): mọi người dùng đã đăng nhập.
                        .requestMatchers(HttpMethod.POST, "/api/forecast/demand").authenticated()
                        // Ghi dữ liệu kho (nhập, xuất, điều chỉnh, chuyển kho): VIEWER không được.
                        .anyRequest().hasAnyRole(ADMIN, MANAGER, STAFF))
                .addFilterBefore(new JwtAuthenticationFilter(jwtService),
                        UsernamePasswordAuthenticationFilter.class)
                .build();
    }

    private void writeError(
            HttpServletResponse response,
            ObjectMapper objectMapper,
            HttpStatus status,
            String code,
            String message
    ) throws IOException {
        response.setStatus(status.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        objectMapper.writeValue(response.getOutputStream(),
                ApiResponse.error(new ApiError(code, message)));
    }
}

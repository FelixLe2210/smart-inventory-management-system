package com.smartinventory.config;

import com.smartinventory.realtime.InventoryWebSocketHandler;
import com.smartinventory.realtime.JwtHandshakeInterceptor;
import com.smartinventory.security.JwtService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

/** Endpoint thời gian thực: {@code ws://host:8080/ws/inventory?token=<JWT>}. */
@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    private final InventoryWebSocketHandler handler;
    private final JwtService jwtService;
    private final String[] allowedOrigins;

    public WebSocketConfig(InventoryWebSocketHandler handler, JwtService jwtService,
                           @Value("${app.cors.allowed-origins:http://localhost:3000,http://localhost:5173,http://localhost:5174,http://localhost:8081}")
                           String[] allowedOrigins) {
        this.handler = handler;
        this.jwtService = jwtService;
        this.allowedOrigins = allowedOrigins;
    }

    @Bean
    static InventoryWebSocketHandler inventoryWebSocketHandler() {
        return new InventoryWebSocketHandler();
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(handler, "/ws/inventory")
                .addInterceptors(new JwtHandshakeInterceptor(jwtService))
                .setAllowedOrigins(allowedOrigins);
    }
}

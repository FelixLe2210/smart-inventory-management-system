package com.smartinventory.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class CorsConfig implements WebMvcConfigurer {
// file này để backend nhận mọi loại API từ FE mà không bị chặn. tại vì FE chạy ở port khác
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**") // áp dụng luật cho tất cả các đường dẫn API
                .allowedOrigins("http://localhost:3000", "http://localhost:5173", "http://localhost:5174") // chi cho phép hai port kia được gửi API đến BE
                .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS") // cho FE đùng đầy đủ các phương thức 
                .allowedHeaders("*"); //cho FE gửi lên mọi loại header
    }
}
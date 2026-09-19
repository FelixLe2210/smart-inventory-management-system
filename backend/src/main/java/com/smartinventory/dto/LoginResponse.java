package com.smartinventory.dto;

import java.util.List;

public record LoginResponse(
        int id,
        String username,
        String email,
        List<String> roles,
        String accessToken
) {
}
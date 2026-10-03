package com.smartinventory.dto;

import java.util.List;

/** Authenticated user profile and signed JWT access token. */
public record LoginResponse(
        int id,
        String username,
        String email,
        List<String> roles,
        String accessToken
) {
}
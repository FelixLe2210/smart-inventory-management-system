package com.smartinventory.dto;

import java.util.List;

/**
 * Body of a successful {@code POST /api/auth/login} response.
 *
 * <p>{@code accessToken} is a signed JWT to send as a Bearer token on protected
 * API requests.
 */
public record LoginResponse(
        Long id,
        String username,
        String email,
        List<String> roles,
        String accessToken
) {
}

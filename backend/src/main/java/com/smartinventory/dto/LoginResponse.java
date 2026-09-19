package com.smartinventory.dto;

import java.util.List;

sangle
public record LoginResponse(
        int id,

/**
 * Body of a successful {@code POST /api/auth/login} response (wrapped in {@link ApiResponse}).
 *
 * <p>{@code accessToken} is a temporary opaque session token (random UUID), NOT a JWT.
 * It lets the frontend start wiring up "store the token, send it as
 * {@code Authorization: Bearer <token>}" now. It is not yet verified on subsequent
 * requests — no endpoint checks it, because no protected endpoints exist yet.
 * When real JWT-based auth is introduced, only this field's value and the (not yet
 * written) token-validation filter change — the response shape and frontend
 * integration stay the same.
 */
public record LoginResponse(
        Long id,
 master
        String username,
        String email,
        List<String> roles,
        String accessToken
) {
 sangle
}

}
 master

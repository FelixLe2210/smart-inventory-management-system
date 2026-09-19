package com.smartinventory.dto;

import jakarta.validation.constraints.NotBlank;

 sangle
public record LoginRequest(
        @NotBlank String usernameOrEmail,
        @NotBlank String password
) {
}

/**
 * Body of {@code POST /api/auth/login}.
 *
 * <p>{@code usernameOrEmail} accepts either the username or the email so the frontend
 * doesn't need to ask the user which one they're typing.
 */
public record LoginRequest(

        @NotBlank(message = "Username or email is required")
        String usernameOrEmail,

        @NotBlank(message = "Password is required")
        String password
) {
}
master

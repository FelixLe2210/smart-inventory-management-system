package com.smartinventory.dto;

/**
 * Which sign-in methods this server offers, so the login page only needs the backend's configuration.
 * {@code googleClientId} / {@code facebookAppId} are public identifiers (never secrets); null = not configured.
 */
public record AuthProvidersResponse(
        String googleClientId,
        String facebookAppId,
        boolean phoneEnabled,
        boolean registrationEnabled
) {
}

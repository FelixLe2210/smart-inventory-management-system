package com.smartinventory.security.social;

/** Verified identity returned by a provider. {@code subject} is the provider's stable user id. */
public record SocialProfile(
        String provider,
        String subject,
        String email,
        boolean emailVerified,
        String displayName
) {
}

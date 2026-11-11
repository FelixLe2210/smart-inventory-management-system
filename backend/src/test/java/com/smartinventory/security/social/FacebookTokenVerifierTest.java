package com.smartinventory.security.social;

import com.smartinventory.exception.UnauthorizedException;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class FacebookTokenVerifierTest {

    private static Map<String, Object> debug(String appId, Object isValid, String userId) {
        Map<String, Object> data = Map.of("app_id", appId, "is_valid", isValid, "user_id", userId);
        return Map.of("data", data);
    }

    @Test
    void acceptsValidTokenOfThisAppAndReturnsProfile() {
        Map<String, Object> me = Map.of("id", "42", "name", "Binh", "email", "Binh@Example.com");

        SocialProfile profile = FacebookTokenVerifier.toProfile(debug("app-1", true, "42"), me, "app-1");

        assertEquals("FACEBOOK", profile.provider());
        assertEquals("42", profile.subject());
        assertEquals("binh@example.com", profile.email());
        assertTrue(profile.emailVerified());
        assertEquals("Binh", profile.displayName());
    }

    @Test
    void worksWhenFacebookReturnsNoEmail() {
        Map<String, Object> me = Map.of("id", "42", "name", "Binh");

        SocialProfile profile = FacebookTokenVerifier.toProfile(debug("app-1", true, "42"), me, "app-1");

        assertNull(profile.email());
        assertFalse(profile.emailVerified());
    }

    @Test
    void rejectsTokenOfAnotherAppInvalidTokenOrMismatchedUser() {
        Map<String, Object> me = Map.of("id", "42");
        assertThrows(UnauthorizedException.class,
                () -> FacebookTokenVerifier.toProfile(debug("other-app", true, "42"), me, "app-1"));
        assertThrows(UnauthorizedException.class,
                () -> FacebookTokenVerifier.toProfile(debug("app-1", false, "42"), me, "app-1"));
        assertThrows(UnauthorizedException.class,
                () -> FacebookTokenVerifier.toProfile(debug("app-1", true, "99"), me, "app-1"));
        assertThrows(UnauthorizedException.class,
                () -> FacebookTokenVerifier.toProfile(null, me, "app-1"));
    }

    @Test
    void needsBothAppIdAndSecretToBeConfigured() {
        assertFalse(new FacebookTokenVerifier("app-1", "").isConfigured());
        assertFalse(new FacebookTokenVerifier("", "secret").isConfigured());
        assertTrue(new FacebookTokenVerifier("app-1", "secret").isConfigured());
    }
}

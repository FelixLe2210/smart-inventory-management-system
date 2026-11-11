package com.smartinventory.security.social;

import com.smartinventory.exception.UnauthorizedException;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class GoogleTokenVerifierTest {

    @Test
    void acceptsTokenIssuedToThisClientAndNormalizesEmail() {
        Map<String, Object> claims = Map.of(
                "aud", "client-1", "sub", "1234", "email", "Ann@Example.com", "email_verified", "true");

        SocialProfile profile = GoogleTokenVerifier.toProfile(claims, "client-1");

        assertEquals("GOOGLE", profile.provider());
        assertEquals("1234", profile.subject());
        assertEquals("ann@example.com", profile.email());
        assertTrue(profile.emailVerified());
        assertEquals("ann", profile.displayName());
    }

    @Test
    void authorizedPartyAlsoCountsAsThisClient() {
        Map<String, Object> claims = Map.of("aud", "other", "azp", "client-1", "sub", "1");
        assertEquals("1", GoogleTokenVerifier.toProfile(claims, "client-1").subject());
    }

    @Test
    void rejectsTokenIssuedToAnotherApplication() {
        Map<String, Object> claims = Map.of("aud", "someone-else", "azp", "someone-else", "sub", "1");

        UnauthorizedException ex = assertThrows(UnauthorizedException.class,
                () -> GoogleTokenVerifier.toProfile(claims, "client-1"));
        assertEquals("SOCIAL_VERIFY_FAILED", ex.getCode());
    }

    @Test
    void unverifiedEmailIsNotTrusted() {
        Map<String, Object> claims = Map.of("aud", "client-1", "sub", "1", "email", "a@b.com", "email_verified", "false");
        assertFalse(GoogleTokenVerifier.toProfile(claims, "client-1").emailVerified());
    }

    @Test
    void missingUserIdOrBodyIsRejected() {
        Map<String, Object> noSubject = Map.of("aud", "client-1");
        assertThrows(UnauthorizedException.class, () -> GoogleTokenVerifier.toProfile(noSubject, "client-1"));
        assertThrows(UnauthorizedException.class, () -> GoogleTokenVerifier.toProfile(null, "client-1"));
    }

    @Test
    void notConfiguredWithoutClientId() {
        GoogleTokenVerifier verifier = new GoogleTokenVerifier("  ");
        assertFalse(verifier.isConfigured());
        assertEquals("GOOGLE", verifier.provider());
    }
}

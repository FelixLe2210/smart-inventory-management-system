package com.smartinventory.security.social;

import com.smartinventory.exception.BadRequestException;
import com.smartinventory.exception.UnauthorizedException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.time.Duration;
import java.util.Locale;
import java.util.Map;

/**
 * Verifies a Google OAuth access token (obtained in the browser with Google Identity Services) by asking
 * Google's tokeninfo endpoint, then checks the token was issued to THIS application's client id.
 */
@Component
public class GoogleTokenVerifier implements SocialTokenVerifier {

    public static final String PROVIDER = "GOOGLE";
    private static final String TOKENINFO_URL = "https://oauth2.googleapis.com/tokeninfo?access_token={token}";

    private final RestClient restClient;
    private final String clientId;

    public GoogleTokenVerifier(@Value("${app.auth.google.client-id:}") String clientId) {
        this.clientId = clientId == null ? "" : clientId.trim();
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(5));
        factory.setReadTimeout(Duration.ofSeconds(10));
        this.restClient = RestClient.builder().requestFactory(factory).build();
    }

    @Override
    public String provider() {
        return PROVIDER;
    }

    @Override
    public boolean isConfigured() {
        return !clientId.isEmpty();
    }

    @Override
    public String publicClientId() {
        return clientId;
    }

    @Override
    @SuppressWarnings("unchecked")
    public SocialProfile verify(String accessToken) {
        if (!isConfigured()) {
            throw new BadRequestException("PROVIDER_NOT_CONFIGURED", "Google sign-in is not configured on this server.");
        }
        Map<String, Object> claims;
        try {
            claims = restClient.get().uri(TOKENINFO_URL, accessToken).retrieve().body(Map.class);
        } catch (RestClientException ex) {
            throw new UnauthorizedException("SOCIAL_VERIFY_FAILED", "Google could not verify this sign-in.");
        }
        return toProfile(claims, clientId);
    }

    /** Pure checks on Google's answer; kept separate so they can be tested without network access. */
    static SocialProfile toProfile(Map<String, Object> claims, String expectedClientId) {
        if (claims == null) {
            throw new UnauthorizedException("SOCIAL_VERIFY_FAILED", "Google could not verify this sign-in.");
        }
        String audience = text(claims.get("aud"));
        String authorizedParty = text(claims.get("azp"));
        if (!expectedClientId.equals(audience) && !expectedClientId.equals(authorizedParty)) {
            throw new UnauthorizedException("SOCIAL_VERIFY_FAILED", "This Google token was issued for another application.");
        }
        String subject = text(claims.get("sub"));
        if (subject.isEmpty()) {
            subject = text(claims.get("user_id"));
        }
        if (subject.isEmpty()) {
            throw new UnauthorizedException("SOCIAL_VERIFY_FAILED", "Google did not return a user id.");
        }
        String email = text(claims.get("email")).toLowerCase(Locale.ROOT);
        boolean emailVerified = "true".equalsIgnoreCase(text(claims.get("email_verified")));
        int at = email.indexOf('@');
        String displayName = at > 0 ? email.substring(0, at) : null;
        return new SocialProfile(PROVIDER, subject, email.isEmpty() ? null : email, emailVerified && !email.isEmpty(), displayName);
    }

    private static String text(Object value) {
        return value == null ? "" : String.valueOf(value).trim();
    }
}

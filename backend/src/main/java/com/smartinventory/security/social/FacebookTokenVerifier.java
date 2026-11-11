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
 * Verifies a Facebook user access token: {@code debug_token} (needs the app secret) proves the token is valid
 * and was issued to THIS app, then {@code /me} returns the profile. Facebook only returns an email address that
 * the user has confirmed, so a returned email is treated as verified.
 */
@Component
public class FacebookTokenVerifier implements SocialTokenVerifier {

    public static final String PROVIDER = "FACEBOOK";
    private static final String DEBUG_URL =
            "https://graph.facebook.com/debug_token?input_token={token}&access_token={appToken}";
    private static final String ME_URL =
            "https://graph.facebook.com/me?fields=id,name,email&access_token={token}";

    private final RestClient restClient;
    private final String appId;
    private final String appSecret;

    public FacebookTokenVerifier(
            @Value("${app.auth.facebook.app-id:}") String appId,
            @Value("${app.auth.facebook.app-secret:}") String appSecret
    ) {
        this.appId = appId == null ? "" : appId.trim();
        this.appSecret = appSecret == null ? "" : appSecret.trim();
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
        return !appId.isEmpty() && !appSecret.isEmpty();
    }

    @Override
    public String publicClientId() {
        return appId;
    }

    @Override
    public SocialProfile verify(String accessToken) {
        if (!isConfigured()) {
            throw new BadRequestException("PROVIDER_NOT_CONFIGURED", "Facebook sign-in is not configured on this server.");
        }
        Map<String, Object> debug = fetch(DEBUG_URL, accessToken, appId + "|" + appSecret);
        Map<String, Object> me = fetch(ME_URL, accessToken);
        return toProfile(debug, me, appId);
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> fetch(String url, Object... variables) {
        try {
            return restClient.get().uri(url, variables).retrieve().body(Map.class);
        } catch (RestClientException ex) {
            throw new UnauthorizedException("SOCIAL_VERIFY_FAILED", "Facebook could not verify this sign-in.");
        }
    }

    /** Pure checks on Facebook's answers; kept separate so they can be tested without network access. */
    static SocialProfile toProfile(Map<String, Object> debug, Map<String, Object> me, String expectedAppId) {
        Object dataObject = debug == null ? null : debug.get("data");
        if (!(dataObject instanceof Map<?, ?> data)) {
            throw new UnauthorizedException("SOCIAL_VERIFY_FAILED", "Facebook could not verify this sign-in.");
        }
        boolean valid = "true".equalsIgnoreCase(text(data.get("is_valid")));
        String userId = text(data.get("user_id"));
        String meId = me == null ? "" : text(me.get("id"));
        if (!valid || !expectedAppId.equals(text(data.get("app_id"))) || userId.isEmpty() || !userId.equals(meId)) {
            throw new UnauthorizedException("SOCIAL_VERIFY_FAILED", "This Facebook token is not valid for this application.");
        }
        String email = text(me.get("email")).toLowerCase(Locale.ROOT);
        String name = text(me.get("name"));
        return new SocialProfile(PROVIDER, userId, email.isEmpty() ? null : email, !email.isEmpty(), name.isEmpty() ? null : name);
    }

    private static String text(Object value) {
        return value == null ? "" : String.valueOf(value).trim();
    }
}

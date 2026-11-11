package com.smartinventory.security.social;

/** Checks an access token with a social provider and returns who it belongs to. */
public interface SocialTokenVerifier {

    /** Upper-case provider key stored in {@code user_identities.provider}, e.g. GOOGLE. */
    String provider();

    /** True when the server has the credentials needed to verify tokens of this provider. */
    boolean isConfigured();

    /** Public identifier the browser SDK needs (Google client id / Facebook app id). */
    String publicClientId();

    /**
     * @throws com.smartinventory.exception.UnauthorizedException when the token is invalid, expired or issued to another app
     * @throws com.smartinventory.exception.BadRequestException when the provider is not configured
     */
    SocialProfile verify(String accessToken);
}

package com.smartinventory.service;

import com.smartinventory.dto.AuthProvidersResponse;
import com.smartinventory.dto.LoginResponse;
import com.smartinventory.dto.OtpSentResponse;
import com.smartinventory.dto.RegisterRequest;
import com.smartinventory.exception.BadRequestException;
import com.smartinventory.exception.ConflictException;
import com.smartinventory.exception.UnauthorizedException;
import com.smartinventory.model.Role;
import com.smartinventory.model.User;
import com.smartinventory.model.UserIdentity;
import com.smartinventory.repository.RoleRepository;
import com.smartinventory.repository.UserIdentityRepository;
import com.smartinventory.repository.UserRepository;
import com.smartinventory.security.JwtService;
import com.smartinventory.security.social.FacebookTokenVerifier;
import com.smartinventory.security.social.GoogleTokenVerifier;
import com.smartinventory.security.social.SocialProfile;
import com.smartinventory.security.social.SocialTokenVerifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

/**
 * Account creation and the sign-in methods other than username + password: self-registration, Google,
 * Facebook and phone code. {@link AuthService} keeps the password login. Every successful path ends with the
 * same {@link LoginResponse} (a signed JWT), so the rest of the system does not care how the user signed in.
 *
 * <p>New accounts get the role in {@code app.auth.default-role} (VIEWER unless configured otherwise, never ADMIN).
 */
@Service
public class AccountAuthService {

    private static final String PLACEHOLDER_EMAIL_DOMAIN = "@users.smartinventory.local";

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final UserIdentityRepository identityRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final PhoneOtpService phoneOtpService;
    private final List<SocialTokenVerifier> verifiers;
    private final boolean registrationEnabled;
    private final String defaultRoleName;

    public AccountAuthService(
            UserRepository userRepository,
            RoleRepository roleRepository,
            UserIdentityRepository identityRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            PhoneOtpService phoneOtpService,
            List<SocialTokenVerifier> verifiers,
            @Value("${app.auth.registration-enabled:true}") boolean registrationEnabled,
            @Value("${app.auth.default-role:VIEWER}") String defaultRoleName
    ) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.identityRepository = identityRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.phoneOtpService = phoneOtpService;
        this.verifiers = verifiers;
        this.registrationEnabled = registrationEnabled;
        this.defaultRoleName = defaultRoleName.trim().toUpperCase(Locale.ROOT);
        if ("ADMIN".equals(this.defaultRoleName)) {
            throw new IllegalStateException("app.auth.default-role must not be ADMIN.");
        }
    }

    // ---------------------------------------------------------------- providers

    public AuthProvidersResponse providers() {
        return new AuthProvidersResponse(
                configuredPublicId(GoogleTokenVerifier.PROVIDER),
                configuredPublicId(FacebookTokenVerifier.PROVIDER),
                phoneOtpService.isEnabled(),
                registrationEnabled);
    }

    private String configuredPublicId(String provider) {
        return verifiers.stream()
                .filter(v -> v.provider().equals(provider) && v.isConfigured())
                .map(SocialTokenVerifier::publicClientId)
                .findFirst()
                .orElse(null);
    }

    // ---------------------------------------------------------------- register with email + password

    @Transactional
    public LoginResponse register(RegisterRequest request) {
        if (!registrationEnabled) {
            throw new BadRequestException("REGISTRATION_DISABLED",
                    "Self-registration is turned off. Ask an administrator for an account.");
        }
        String username = request.username().trim();
        String email = request.email().trim().toLowerCase(Locale.ROOT);
        String password = request.password();

        if (!hasLetterAndDigit(password)) {
            throw new BadRequestException("WEAK_PASSWORD", "Password must contain at least one letter and one digit.");
        }
        if (userRepository.existsByUsername(username)) {
            throw new ConflictException("USERNAME_TAKEN", "This username is already taken.");
        }
        if (userRepository.existsByEmail(email)) {
            throw new ConflictException("EMAIL_TAKEN", "An account with this email already exists.");
        }
        User user = userRepository.save(newUser(username, email, passwordEncoder.encode(password), null));
        return toLoginResponse(user);
    }

    // ---------------------------------------------------------------- Google / Facebook

    @Transactional
    public LoginResponse loginWithSocial(String provider, String accessToken) {
        SocialTokenVerifier verifier = verifiers.stream()
                .filter(v -> v.provider().equalsIgnoreCase(provider))
                .findFirst()
                .orElseThrow(() -> new BadRequestException("UNKNOWN_PROVIDER", "Unsupported sign-in provider."));
        SocialProfile profile = verifier.verify(accessToken);

        User user = identityRepository.findByProviderAndProviderUserId(profile.provider(), profile.subject())
                .map(identity -> userRepository.findById(identity.getUserId())
                        .orElseThrow(() -> new UnauthorizedException("INVALID_CREDENTIALS", "Account not found.")))
                .orElseGet(() -> linkOrCreate(profile));
        requireActive(user);
        return toLoginResponse(user);
    }

    /** First time this provider identity signs in: attach it to the account with the same verified email, or create one. */
    private User linkOrCreate(SocialProfile profile) {
        User existing = null;
        if (profile.emailVerified() && profile.email() != null) {
            existing = userRepository.findByEmail(profile.email()).orElse(null);
        }
        User user = existing;
        if (user == null) {
            boolean emailFree = profile.email() != null && !userRepository.existsByEmail(profile.email());
            String email = emailFree ? profile.email() : placeholderEmail(profile.provider(), profile.subject());
            String base = profile.email() != null
                    ? localPart(profile.email())
                    : profile.provider().toLowerCase(Locale.ROOT) + profile.subject();
            user = userRepository.save(newUser(
                    uniqueUsername(base), email, passwordEncoder.encode(UUID.randomUUID().toString()), null));
        }
        identityRepository.save(new UserIdentity(user.getId(), profile.provider(), profile.subject()));
        return user;
    }

    // ---------------------------------------------------------------- phone

    public OtpSentResponse requestPhoneOtp(String rawPhone) {
        return phoneOtpService.requestCode(PhoneNumbers.normalize(rawPhone));
    }

    /** Verifies the code; signs in the owner of the number, or creates the account on first use. */
    @Transactional
    public LoginResponse loginWithPhone(String rawPhone, String code) {
        String phone = PhoneNumbers.normalize(rawPhone);
        phoneOtpService.verify(phone, code);
        User user = userRepository.findByPhone(phone).orElseGet(() -> createPhoneUser(phone));
        requireActive(user);
        return toLoginResponse(user);
    }

    private User createPhoneUser(String phone) {
        String digits = phone.substring(1);
        User user = newUser(
                uniqueUsername("u" + digits),
                "phone_" + digits + PLACEHOLDER_EMAIL_DOMAIN,
                passwordEncoder.encode(UUID.randomUUID().toString()),
                phone);
        return userRepository.save(user);
    }

    // ---------------------------------------------------------------- helpers

    private User newUser(String username, String email, String passwordHash, String phone) {
        Role role = roleRepository.findByName(defaultRoleName)
                .orElseThrow(() -> new IllegalStateException("Default role '" + defaultRoleName + "' does not exist."));
        User user = new User();
        user.setUsername(username);
        user.setEmail(email);
        user.setPasswordHash(passwordHash);
        user.setPhone(phone);
        user.setActive(true);
        user.setRoles(new HashSet<>(Set.of(role)));
        return user;
    }

    private void requireActive(User user) {
        if (!Boolean.TRUE.equals(user.getActive())) {
            throw new UnauthorizedException("ACCOUNT_DISABLED", "This account has been disabled.");
        }
    }

    private LoginResponse toLoginResponse(User user) {
        List<String> roleNames = user.getRoles().stream().map(Role::getName).sorted().toList();
        String accessToken = jwtService.generateToken(user.getUsername(), roleNames);
        return new LoginResponse(user.getId(), user.getUsername(), user.getEmail(), roleNames, accessToken);
    }

    private String uniqueUsername(String base) {
        String cleaned = base.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9._-]", "");
        if (cleaned.length() < 3) {
            cleaned = "user" + cleaned;
        }
        if (cleaned.length() > 40) {
            cleaned = cleaned.substring(0, 40);
        }
        String candidate = cleaned;
        int suffix = 1;
        while (userRepository.existsByUsername(candidate)) {
            suffix++;
            candidate = suffix > 50
                    ? cleaned + UUID.randomUUID().toString().substring(0, 8)
                    : cleaned + suffix;
        }
        return candidate;
    }

    private static String placeholderEmail(String provider, String subject) {
        return provider.toLowerCase(Locale.ROOT) + "_" + subject.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]", "")
                + PLACEHOLDER_EMAIL_DOMAIN;
    }

    private static String localPart(String email) {
        int at = email.indexOf('@');
        return at > 0 ? email.substring(0, at) : email;
    }

    private static boolean hasLetterAndDigit(String password) {
        return password.chars().anyMatch(Character::isLetter) && password.chars().anyMatch(Character::isDigit);
    }
}

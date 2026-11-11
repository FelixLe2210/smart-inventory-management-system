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
import com.smartinventory.security.social.SocialProfile;
import com.smartinventory.security.social.SocialTokenVerifier;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AccountAuthServiceTest {

    private static final String SECRET = "test-secret-key-that-is-at-least-32-bytes-long";

    @Mock private UserRepository userRepository;
    @Mock private RoleRepository roleRepository;
    @Mock private UserIdentityRepository identityRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private PhoneOtpService phoneOtpService;
    @Mock private SocialTokenVerifier googleVerifier;

    private final JwtService jwtService = new JwtService(SECRET, 3_600_000);
    private Role staffRole;
    private AccountAuthService service;

    @BeforeEach
    void setUp() {
        staffRole = new Role();
        staffRole.setName("STAFF");
        lenient().when(roleRepository.findByName("STAFF")).thenReturn(Optional.of(staffRole));
        lenient().when(passwordEncoder.encode(anyString())).thenReturn("hashed");
        lenient().when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));
        lenient().when(googleVerifier.provider()).thenReturn("GOOGLE");
        service = newService(true, "STAFF");
    }

    private AccountAuthService newService(boolean registrationEnabled, String defaultRole) {
        return new AccountAuthService(userRepository, roleRepository, identityRepository, passwordEncoder,
                jwtService, phoneOtpService, List.of(googleVerifier), registrationEnabled, defaultRole);
    }

    private User existingUser(String username, String email) {
        User user = new User();
        user.setUsername(username);
        user.setEmail(email);
        user.setPasswordHash("hash");
        user.setActive(true);
        user.setRoles(Set.of(staffRole));
        return user;
    }

    private User savedUser() {
        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        return captor.getValue();
    }

    // ------------------------------------------------------------ register

    @Test
    void registerCreatesStaffAccountAndSignsIn() {
        LoginResponse response = service.register(new RegisterRequest("new.user", " New.User@Example.com ", "Passw0rd!"));

        User created = savedUser();
        assertEquals("new.user", created.getUsername());
        assertEquals("new.user@example.com", created.getEmail());
        assertEquals("hashed", created.getPasswordHash());
        assertTrue(created.getActive());
        assertEquals(1, created.getRoles().size());
        assertEquals(List.of("STAFF"), response.roles());
        assertEquals("new.user", jwtService.parseToken(response.accessToken()).getSubject());
    }

    @Test
    void registerRejectsTakenUsernameAndEmail() {
        when(userRepository.existsByUsername("taken")).thenReturn(true);
        ConflictException usernameTaken = assertThrows(ConflictException.class,
                () -> service.register(new RegisterRequest("taken", "a@b.com", "Passw0rd!")));
        assertEquals("USERNAME_TAKEN", usernameTaken.getCode());

        when(userRepository.existsByEmail("dup@b.com")).thenReturn(true);
        ConflictException emailTaken = assertThrows(ConflictException.class,
                () -> service.register(new RegisterRequest("fresh", "dup@b.com", "Passw0rd!")));
        assertEquals("EMAIL_TAKEN", emailTaken.getCode());

        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void registerRejectsPasswordsWithoutBothLettersAndDigits() {
        for (String weak : new String[] {"abcdefgh", "12345678"}) {
            BadRequestException ex = assertThrows(BadRequestException.class,
                    () -> service.register(new RegisterRequest("someone", "s@b.com", weak)));
            assertEquals("WEAK_PASSWORD", ex.getCode());
        }
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void registerIsRefusedWhenSwitchedOff() {
        AccountAuthService closed = newService(false, "STAFF");

        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> closed.register(new RegisterRequest("someone", "s@b.com", "Passw0rd!")));
        assertEquals("REGISTRATION_DISABLED", ex.getCode());
    }

    @Test
    void defaultRoleCanNeverBeAdmin() {
        assertThrows(IllegalStateException.class, () -> newService(true, " admin "));
    }

    // ------------------------------------------------------------ Google / Facebook

    @Test
    void knownIdentitySignsInWithoutCreatingAnything() {
        User alice = existingUser("alice", "alice@example.com");
        when(googleVerifier.verify("tok")).thenReturn(new SocialProfile("GOOGLE", "sub-1", "alice@example.com", true, "alice"));
        when(identityRepository.findByProviderAndProviderUserId("GOOGLE", "sub-1"))
                .thenReturn(Optional.of(new UserIdentity(7L, "GOOGLE", "sub-1")));
        when(userRepository.findById(7L)).thenReturn(Optional.of(alice));

        LoginResponse response = service.loginWithSocial("google", "tok");

        assertEquals("alice", response.username());
        verify(identityRepository, never()).save(any(UserIdentity.class));
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void firstSignInLinksTheAccountWithTheSameVerifiedEmail() {
        User alice = existingUser("alice", "alice@example.com");
        when(googleVerifier.verify("tok")).thenReturn(new SocialProfile("GOOGLE", "sub-1", "alice@example.com", true, "alice"));
        when(identityRepository.findByProviderAndProviderUserId("GOOGLE", "sub-1")).thenReturn(Optional.empty());
        when(userRepository.findByEmail("alice@example.com")).thenReturn(Optional.of(alice));

        LoginResponse response = service.loginWithSocial("GOOGLE", "tok");

        assertEquals("alice", response.username());
        verify(userRepository, never()).save(any(User.class));
        ArgumentCaptor<UserIdentity> identity = ArgumentCaptor.forClass(UserIdentity.class);
        verify(identityRepository).save(identity.capture());
        assertEquals("GOOGLE", identity.getValue().getProvider());
        assertEquals("sub-1", identity.getValue().getProviderUserId());
    }

    @Test
    void unknownPersonGetsANewStaffAccountNamedAfterTheirEmail() {
        when(googleVerifier.verify("tok")).thenReturn(new SocialProfile("GOOGLE", "sub-2", "bob@example.com", true, "bob"));
        when(identityRepository.findByProviderAndProviderUserId("GOOGLE", "sub-2")).thenReturn(Optional.empty());
        when(userRepository.findByEmail("bob@example.com")).thenReturn(Optional.empty());

        LoginResponse response = service.loginWithSocial("google", "tok");

        User created = savedUser();
        assertEquals("bob", created.getUsername());
        assertEquals("bob@example.com", created.getEmail());
        assertEquals(List.of("STAFF"), response.roles());
        verify(identityRepository).save(any(UserIdentity.class));
    }

    @Test
    void usernameGetsANumberWhenTheNameIsTaken() {
        when(googleVerifier.verify("tok")).thenReturn(new SocialProfile("GOOGLE", "sub-2", "bob@example.com", true, "bob"));
        when(identityRepository.findByProviderAndProviderUserId("GOOGLE", "sub-2")).thenReturn(Optional.empty());
        when(userRepository.findByEmail("bob@example.com")).thenReturn(Optional.empty());
        when(userRepository.existsByUsername("bob")).thenReturn(true);

        service.loginWithSocial("google", "tok");

        assertEquals("bob2", savedUser().getUsername());
    }

    @Test
    void unverifiedEmailNeverLinksToAnExistingAccount() {
        when(googleVerifier.verify("tok")).thenReturn(new SocialProfile("GOOGLE", "sub-9", "carol@example.com", false, "carol"));
        when(identityRepository.findByProviderAndProviderUserId("GOOGLE", "sub-9")).thenReturn(Optional.empty());
        when(userRepository.existsByEmail("carol@example.com")).thenReturn(true);

        service.loginWithSocial("google", "tok");

        verify(userRepository, never()).findByEmail(anyString());
        User created = savedUser();
        assertEquals("google_sub9@users.smartinventory.local", created.getEmail());
    }

    @Test
    void disabledAccountCannotSignInThroughAProvider() {
        User disabled = existingUser("dan", "dan@example.com");
        disabled.setActive(false);
        when(googleVerifier.verify("tok")).thenReturn(new SocialProfile("GOOGLE", "sub-3", "dan@example.com", true, "dan"));
        when(identityRepository.findByProviderAndProviderUserId("GOOGLE", "sub-3"))
                .thenReturn(Optional.of(new UserIdentity(3L, "GOOGLE", "sub-3")));
        when(userRepository.findById(3L)).thenReturn(Optional.of(disabled));

        UnauthorizedException ex = assertThrows(UnauthorizedException.class, () -> service.loginWithSocial("google", "tok"));
        assertEquals("ACCOUNT_DISABLED", ex.getCode());
    }

    @Test
    void unknownProviderIsRejected() {
        BadRequestException ex = assertThrows(BadRequestException.class, () -> service.loginWithSocial("twitter", "tok"));
        assertEquals("UNKNOWN_PROVIDER", ex.getCode());
    }

    @Test
    void providersListsOnlyConfiguredMethods() {
        when(googleVerifier.isConfigured()).thenReturn(true);
        when(googleVerifier.publicClientId()).thenReturn("google-client");
        when(phoneOtpService.isEnabled()).thenReturn(true);

        AuthProvidersResponse providers = service.providers();

        assertEquals("google-client", providers.googleClientId());
        assertNull(providers.facebookAppId());
        assertTrue(providers.phoneEnabled());
        assertTrue(providers.registrationEnabled());
    }

    // ------------------------------------------------------------ phone

    @Test
    void requestOtpNormalizesTheNumberBeforeSending() {
        OtpSentResponse sent = new OtpSentResponse("+84912345678", 300, 30, null);
        when(phoneOtpService.requestCode("+84912345678")).thenReturn(sent);

        assertSame(sent, service.requestPhoneOtp("0912 345 678"));
    }

    @Test
    void newPhoneNumberCreatesAnAccountAfterTheCodeIsVerified() {
        when(userRepository.findByPhone("+84912345678")).thenReturn(Optional.empty());

        LoginResponse response = service.loginWithPhone("0912 345 678", "123456");

        verify(phoneOtpService).verify("+84912345678", "123456");
        User created = savedUser();
        assertEquals("+84912345678", created.getPhone());
        assertEquals("u84912345678", created.getUsername());
        assertEquals("phone_84912345678@users.smartinventory.local", created.getEmail());
        assertEquals(List.of("STAFF"), response.roles());
    }

    @Test
    void knownPhoneNumberSignsInToTheSameAccount() {
        User owner = existingUser("minh", "minh@example.com");
        when(userRepository.findByPhone("+84912345678")).thenReturn(Optional.of(owner));

        LoginResponse response = service.loginWithPhone("+84912345678", "123456");

        assertEquals("minh", response.username());
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void wrongCodeStopsBeforeAnyAccountIsTouched() {
        doThrow(new UnauthorizedException("OTP_INVALID", "wrong"))
                .when(phoneOtpService).verify("+84912345678", "000000");

        UnauthorizedException ex = assertThrows(UnauthorizedException.class,
                () -> service.loginWithPhone("0912345678", "000000"));
        assertEquals("OTP_INVALID", ex.getCode());
        verify(userRepository, never()).findByPhone(anyString());
        verify(userRepository, never()).save(any(User.class));
    }
}

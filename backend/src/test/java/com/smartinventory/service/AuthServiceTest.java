package com.smartinventory.service;

import com.smartinventory.dto.LoginRequest;
import com.smartinventory.dto.LoginResponse;
import com.smartinventory.exception.UnauthorizedException;
import com.smartinventory.model.Role;
import com.smartinventory.model.User;
import com.smartinventory.repository.UserRepository;
import com.smartinventory.security.JwtService;
import io.jsonwebtoken.Claims;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    private AuthService authService;
    private User activeUser;

    @BeforeEach
    void setUp() {
        authService = new AuthService(
                userRepository,
                passwordEncoder,
                new JwtService("test-secret-key-that-is-at-least-32-bytes-long", 3_600_000));

        activeUser = new User();
        activeUser.setUsername("admin");
        activeUser.setEmail("admin@example.com");
        activeUser.setPasswordHash("$2a$test-hash");
        activeUser.setActive(true);
    }

    @Test
    void loginWithUsernameReturnsSignedTokenAndRoles() {
        addAdminRole();
        when(userRepository.findByUsername("admin")).thenReturn(Optional.of(activeUser));
        when(passwordEncoder.matches("correct-password", "$2a$test-hash")).thenReturn(true);

        LoginResponse response = authService.login(new LoginRequest("admin", "correct-password"));
        Claims claims = authServiceJwt().parseToken(response.accessToken());

        assertEquals("admin", response.username());
        assertEquals("admin", claims.getSubject());
        assertEquals(java.util.List.of("ADMIN"), response.roles());
        assertEquals(java.util.List.of("ADMIN"), claims.get("roles"));
    }

    @Test
    void loginFindsUserByEmail() {
        addAdminRole();
        when(userRepository.findByUsername("admin@example.com")).thenReturn(Optional.empty());
        when(userRepository.findByEmail("admin@example.com")).thenReturn(Optional.of(activeUser));
        when(passwordEncoder.matches("correct-password", "$2a$test-hash")).thenReturn(true);

        LoginResponse response = authService.login(
                new LoginRequest("admin@example.com", "correct-password"));

        assertEquals("admin", response.username());
        verify(userRepository).findByEmail("admin@example.com");
    }

    @Test
    void loginRejectsUnknownUser() {
        when(userRepository.findByUsername("missing")).thenReturn(Optional.empty());
        when(userRepository.findByEmail("missing")).thenReturn(Optional.empty());

        assertThrows(UnauthorizedException.class,
                () -> authService.login(new LoginRequest("missing", "password")));
        verifyNoInteractions(passwordEncoder);
    }

    @Test
    void loginRejectsWrongPasswordAndDisabledAccount() {
        when(userRepository.findByUsername("admin")).thenReturn(Optional.of(activeUser));
        when(passwordEncoder.matches("wrong-password", "$2a$test-hash")).thenReturn(false);
        assertThrows(UnauthorizedException.class,
                () -> authService.login(new LoginRequest("admin", "wrong-password")));

        activeUser.setActive(false);
        assertThrows(UnauthorizedException.class,
                () -> authService.login(new LoginRequest("admin", "correct-password")));
        verify(passwordEncoder, never()).matches("correct-password", "$2a$test-hash");
    }

    private JwtService authServiceJwt() {
        return new JwtService("test-secret-key-that-is-at-least-32-bytes-long", 3_600_000);
    }

    private void addAdminRole() {
        Role role = mock(Role.class);
        when(role.getName()).thenReturn("ADMIN");
        activeUser.setRoles(Set.of(role));
    }
}

package com.smartinventory.service;

import com.smartinventory.dto.LoginRequest;
import com.smartinventory.dto.LoginResponse;
import com.smartinventory.exception.UnauthorizedException;
import com.smartinventory.model.Role;
import com.smartinventory.model.User;
import com.smartinventory.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class AuthService {

    /** Same message for every failure reason on purpose - see {@link UnauthorizedException}. */
    private static final String INVALID_CREDENTIALS_MESSAGE = "Invalid username/email or password.";

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public LoginResponse login(LoginRequest request) {
        User user = findByUsernameOrEmail(request.usernameOrEmail())
                .orElseThrow(() -> new UnauthorizedException("INVALID_CREDENTIALS", INVALID_CREDENTIALS_MESSAGE));

        if (!Boolean.TRUE.equals(user.getActive())) {
            throw new UnauthorizedException("ACCOUNT_DISABLED", "This account has been disabled.");
        }

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new UnauthorizedException("INVALID_CREDENTIALS", INVALID_CREDENTIALS_MESSAGE);
        }

        List<String> roleNames = user.getRoles().stream()
                .map(Role::getName)
                .sorted()
                .toList();

        // Temporary opaque token - see LoginResponse javadoc for why this isn't a JWT yet.
        String temporaryAccessToken = UUID.randomUUID().toString();

        return new LoginResponse(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                roleNames,
                temporaryAccessToken
        );
    }

    private Optional<User> findByUsernameOrEmail(String usernameOrEmail) {
        Optional<User> byUsername = userRepository.findByUsername(usernameOrEmail);
        if (byUsername.isPresent()) {
            return byUsername;
        }
        return userRepository.findByEmail(usernameOrEmail);
    }
}

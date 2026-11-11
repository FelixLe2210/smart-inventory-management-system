package com.smartinventory.service;

import com.smartinventory.dto.LoginRequest;
import com.smartinventory.dto.LoginResponse;
import com.smartinventory.exception.TooManyRequestsException;
import com.smartinventory.exception.UnauthorizedException;
import com.smartinventory.model.Role;
import com.smartinventory.model.User;
import com.smartinventory.repository.UserRepository;
import com.smartinventory.security.JwtService;
import com.smartinventory.security.LoginAttemptLimiter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class AuthService {

    /** Same message for every failure reason on purpose - see {@link UnauthorizedException}. */
    private static final String INVALID_CREDENTIALS_MESSAGE = "Invalid username/email or password.";

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    private final LoginAttemptLimiter attemptLimiter;

    @Autowired
    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtService jwtService,
                       LoginAttemptLimiter attemptLimiter) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.attemptLimiter = attemptLimiter;
    }

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtService jwtService) {
        this(userRepository, passwordEncoder, jwtService, new LoginAttemptLimiter(5, java.time.Duration.ofMinutes(15),
                java.time.Clock.systemUTC()));
    }

    public LoginResponse login(LoginRequest request) {
        String identity = request.usernameOrEmail();
        long wait = attemptLimiter.retryAfterSeconds(identity);
        if (wait > 0) {
            throw new TooManyRequestsException("TOO_MANY_ATTEMPTS",
                    "Too many failed sign-in attempts. Try again in " + wait + " seconds.", wait);
        }

        User user = findByUsernameOrEmail(identity).orElse(null);
        if (user == null) {
            attemptLimiter.recordFailure(identity);
            throw new UnauthorizedException("INVALID_CREDENTIALS", INVALID_CREDENTIALS_MESSAGE);
        }

        if (!Boolean.TRUE.equals(user.getActive())) {
            throw new UnauthorizedException("ACCOUNT_DISABLED", "This account has been disabled.");
        }

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            attemptLimiter.recordFailure(identity);
            throw new UnauthorizedException("INVALID_CREDENTIALS", INVALID_CREDENTIALS_MESSAGE);
        }
        attemptLimiter.reset(identity);

        List<String> roleNames = user.getRoles().stream()
                .map(Role::getName)
                .sorted()
                .toList();

        String accessToken = jwtService.generateToken(user.getUsername(), roleNames);

        return new LoginResponse(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                roleNames,
                accessToken
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

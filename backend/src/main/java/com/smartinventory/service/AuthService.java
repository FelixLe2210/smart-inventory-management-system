package com.smartinventory.service;

 sangle
import com.smartinventory.dto.RegisterRequest;
import com.smartinventory.dto.RegisterResponse;
import com.smartinventory.dto.LoginRequest;
import com.smartinventory.dto.LoginResponse;
import com.smartinventory.repository.LoginUser;
import com.smartinventory.repository.UserRepository;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
 master

@Service
public class AuthService {

 sangle
    private static final String DEFAULT_ROLE = "Warehouse Staff";

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    @Transactional
    public RegisterResponse register(RegisterRequest request) {
        String username = request.username().trim();
        String email = request.email().trim().toLowerCase();
        String fullName = request.fullName().trim();

        if (userRepository.existsByUsernameOrEmail(username, email)) {
            throw new DuplicateKeyException("Username or email is already registered");
        }

        try {
            int userId = userRepository.insertUser(
                    username,
                    passwordEncoder.encode(request.password()),
                    fullName,
                    email
            );
            int roleId = userRepository.findRoleId(DEFAULT_ROLE);
            userRepository.assignRole(userId, roleId);
            return new RegisterResponse(userId, username, fullName, email, DEFAULT_ROLE);
        } catch (DuplicateKeyException exception) {
            throw new DuplicateKeyException("Username or email is already registered", exception);
        }
    }

    public LoginResponse login(LoginRequest request) {
        String usernameOrEmail = request.usernameOrEmail().trim();
        LoginUser user = userRepository.findActiveUser(usernameOrEmail)
                .filter(candidate -> passwordEncoder.matches(request.password(), candidate.passwordHash()))
                .orElseThrow(() -> new InvalidCredentialsException("Invalid username/email or password"));
        var roles = userRepository.findRoleNames(user.id());

        return new LoginResponse(
                user.id(),
                user.username(),
                user.email(),
            roles,
            jwtService.createToken(user.id(), user.username(), roles)
        );
    }
}

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
 master

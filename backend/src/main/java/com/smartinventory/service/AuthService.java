package com.smartinventory.service;

import com.smartinventory.dto.LoginRequest;
import com.smartinventory.dto.LoginResponse;
import com.smartinventory.dto.RegisterRequest;
import com.smartinventory.dto.RegisterResponse;
import com.smartinventory.exception.ConflictException;
import com.smartinventory.exception.UnauthorizedException;
import com.smartinventory.model.Role;
import com.smartinventory.model.User;
import com.smartinventory.repository.RoleRepository;
import com.smartinventory.repository.UserRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;

@Service
public class AuthService {

    private static final String DEFAULT_ROLE = "Warehouse Staff";
    private static final String INVALID_CREDENTIALS_MESSAGE = "Invalid username/email or password.";

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(
            UserRepository userRepository,
            RoleRepository roleRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService
    ) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    @Transactional
    public RegisterResponse register(RegisterRequest request) {
        String username = request.username().trim();
        String email = request.email().trim().toLowerCase();
        String fullName = request.fullName().trim();

        if (userRepository.existsByUsernameOrEmail(username, email)) {
            throw new ConflictException("USER_ALREADY_EXISTS", "Username or email is already registered.");
        }

        Role defaultRole = roleRepository.findByRoleName(DEFAULT_ROLE)
                .orElseThrow(() -> new IllegalStateException("Required role does not exist: " + DEFAULT_ROLE));

        User user = new User();
        user.setUsername(username);
        user.setEmail(email);
        user.setFullName(fullName);
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setActive(true);
        user.setRoles(Set.of(defaultRole));

        try {
            User savedUser = userRepository.saveAndFlush(user);
            return new RegisterResponse(
                    savedUser.getUserId(),
                    savedUser.getUsername(),
                    savedUser.getFullName(),
                    savedUser.getEmail(),
                    DEFAULT_ROLE
            );
        } catch (DataIntegrityViolationException exception) {
            throw new ConflictException("USER_ALREADY_EXISTS", "Username or email is already registered.");
        }
    }

    @Transactional(readOnly = true)
    public LoginResponse login(LoginRequest request) {
        String usernameOrEmail = request.usernameOrEmail().trim();
        User user = userRepository.findByUsernameOrEmail(usernameOrEmail, usernameOrEmail)
                .orElseThrow(() -> new UnauthorizedException("INVALID_CREDENTIALS", INVALID_CREDENTIALS_MESSAGE));

        if (!user.isActive()) {
            throw new UnauthorizedException("ACCOUNT_DISABLED", "This account has been disabled.");
        }
        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new UnauthorizedException("INVALID_CREDENTIALS", INVALID_CREDENTIALS_MESSAGE);
        }

        List<String> roleNames = user.getRoles().stream()
                .map(Role::getRoleName)
                .sorted()
                .toList();

        return new LoginResponse(
                user.getUserId(),
                user.getUsername(),
                user.getEmail(),
                roleNames,
                jwtService.createToken(user.getUserId(), user.getUsername(), roleNames)
        );
    }
}
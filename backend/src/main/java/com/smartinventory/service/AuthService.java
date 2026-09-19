package com.smartinventory.service;

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

@Service
public class AuthService {

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
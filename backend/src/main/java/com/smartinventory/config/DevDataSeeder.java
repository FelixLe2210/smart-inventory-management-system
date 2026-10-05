package com.smartinventory.config;

import com.smartinventory.model.Role;
import com.smartinventory.model.User;
import com.smartinventory.repository.RoleRepository;
import com.smartinventory.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.Set;

/**
 * Creates demo users on startup (dev profile only) so the login API has
 * accounts to authenticate against for testing.
 *
 * <p>Demo credentials:
 * <pre>
 *   1. Quản trị viên: username: admin   | password: Admin@123   (Role: Admin)
 *   2. Quản lý kho:   username: tester  | password: Tester@123  (Role: Warehouse Manager)
 *   3. Nhân viên:     username: staff   | password: Staff@123   (Role: Warehouse Staff)
 * </pre>
 */
@Component
@Profile("dev")
public class DevDataSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DevDataSeeder.class);

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

    public DevDataSeeder(UserRepository userRepository,
                          RoleRepository roleRepository,
                          PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        seedUserIfNotExists("admin", "Quản trị viên", "admin@smartinventory.vn", "Admin@123", "Admin");
        seedUserIfNotExists("tester", "Quản lý kho", "tester@smartinventory.vn", "Tester@123", "Warehouse Manager");
        seedUserIfNotExists("staff", "Nhân viên kho", "staff@smartinventory.vn", "Staff@123", "Warehouse Staff");
        seedUserIfNotExists("procurement", "Nhân viên mua hàng", "procurement@smartinventory.vn", "Procurement@123", "Procurement Staff");
    }

    private void seedUserIfNotExists(String username, String fullName, String email, String rawPassword, String roleName) {
        Role role = roleRepository.findByRoleName(roleName)
                .orElse(null);

        if (role == null) {
            log.warn("Role '{}' not found in database. Skipping seed for user '{}'.", roleName, username);
            return;
        }

        User existingUser = userRepository.findByUsernameOrEmail(username, username)
                .orElse(null);
        if (existingUser != null) {
            boolean hasRole = existingUser.getRoles().stream()
                    .anyMatch(existingRole -> existingRole.getRoleId().equals(role.getRoleId()));
            if (!hasRole) {
                existingUser.getRoles().add(role);
                userRepository.save(existingUser);
                log.info("Assigned role '{}' to existing dev user '{}'.", roleName, username);
            }
            return;
        }

        User user = new User();
        user.setUsername(username);
        user.setFullName(fullName);
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(rawPassword));
        user.setActive(true);
        user.setRoles(Set.of(role));

        userRepository.save(user);
        log.info("Seeded demo user '{}' (role: {}) for login testing.", username, roleName);
    }
}

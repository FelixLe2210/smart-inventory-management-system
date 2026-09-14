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
 * Creates one demo ADMIN user on startup (dev profile only) so the login API has
 * something to authenticate against without anyone having to hand-write a
 * bcrypt hash into a SQL migration.
 *
 * <p>Demo credentials (dev environment only - never used outside local/dev):
 * <pre>
 *   username: admin
 *   password: Admin@123
 * </pre>
 */
@Component
@Profile("dev")
public class DevDataSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DevDataSeeder.class);

    private static final String DEMO_USERNAME = "admin";
    private static final String DEMO_EMAIL = "admin@smartinventory.local";
    private static final String DEMO_PASSWORD = "Admin@123";
    private static final String DEMO_ROLE = "ADMIN";

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
        if (userRepository.existsByUsername(DEMO_USERNAME)) {
            return;
        }

        Role adminRole = roleRepository.findByName(DEMO_ROLE)
                .orElseThrow(() -> new IllegalStateException(
                        "Role '" + DEMO_ROLE + "' not found. Did the V1 migration run?"));

        User admin = new User();
        admin.setUsername(DEMO_USERNAME);
        admin.setEmail(DEMO_EMAIL);
        admin.setPasswordHash(passwordEncoder.encode(DEMO_PASSWORD));
        admin.setActive(true);
        admin.setRoles(Set.of(adminRole));

        userRepository.save(admin);
        log.info("Seeded demo user '{}' (dev profile only) for login testing.", DEMO_USERNAME);
    }
}

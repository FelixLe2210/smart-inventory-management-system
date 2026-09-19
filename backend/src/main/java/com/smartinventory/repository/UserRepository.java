package com.smartinventory.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.util.List;
import java.util.Optional;

@Repository
public class UserRepository {

    private final JdbcTemplate jdbcTemplate;

    public UserRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public boolean existsByUsernameOrEmail(String username, String email) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM dbo.Users WHERE Username = ? OR Email = ?",
                Integer.class,
                username,
                email
        );
        return count != null && count > 0;
    }

        public Optional<LoginUser> findActiveUser(String usernameOrEmail) {
        List<LoginUser> users = jdbcTemplate.query(
            "SELECT UserId, Username, Email, PasswordHash FROM dbo.Users "
                + "WHERE IsActive = 1 AND (Username = ? OR Email = ?)",
            (resultSet, rowNumber) -> new LoginUser(
                resultSet.getInt("UserId"),
                resultSet.getString("Username"),
                resultSet.getString("Email"),
                resultSet.getString("PasswordHash")
            ),
            usernameOrEmail,
            usernameOrEmail
        );
        return users.stream().findFirst();
        }

        public List<String> findRoleNames(int userId) {
        return jdbcTemplate.queryForList(
            "SELECT r.RoleName FROM dbo.Roles r "
                + "JOIN dbo.UserRoles ur ON ur.RoleId = r.RoleId "
                + "WHERE ur.UserId = ? ORDER BY r.RoleName",
            String.class,
            userId
        );
        }

    public int insertUser(String username, String passwordHash, String fullName, String email) {
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            PreparedStatement statement = connection.prepareStatement(
                    "INSERT INTO dbo.Users (Username, PasswordHash, FullName, Email, IsActive, CreatedAt) "
                            + "VALUES (?, ?, ?, ?, 1, SYSUTCDATETIME())",
                    Statement.RETURN_GENERATED_KEYS
            );
            statement.setString(1, username);
            statement.setString(2, passwordHash);
            statement.setString(3, fullName);
            statement.setString(4, email);
            return statement;
        }, keyHolder);

        Number generatedId = keyHolder.getKey();
        if (generatedId == null) {
            throw new IllegalStateException("UserId was not generated");
        }
        return generatedId.intValue();
    }

    public int findRoleId(String roleName) {
        Integer roleId = jdbcTemplate.queryForObject(
                "SELECT RoleId FROM dbo.Roles WHERE RoleName = ?",
                Integer.class,
                roleName
        );
        if (roleId == null) {
            throw new IllegalStateException("Required role does not exist: " + roleName);
        }
        return roleId;
    }

    public void assignRole(int userId, int roleId) {
        jdbcTemplate.update(
                "INSERT INTO dbo.UserRoles (UserId, RoleId) VALUES (?, ?)",
                userId,
                roleId
        );
    }
}
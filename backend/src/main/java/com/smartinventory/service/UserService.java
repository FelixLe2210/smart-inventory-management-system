package com.smartinventory.service;

import com.smartinventory.dto.UserResponse;
import com.smartinventory.exception.BadRequestException;
import com.smartinventory.exception.ConflictException;
import com.smartinventory.exception.NotFoundException;
import com.smartinventory.model.Role;
import com.smartinventory.model.User;
import com.smartinventory.repository.RoleRepository;
import com.smartinventory.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/** Quản lý tài khoản và vai trò: chỉ ADMIN được gọi (xem SecurityConfig). */
@Service
@Transactional
public class UserService {

    static final String ADMIN_ROLE = "ADMIN";

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;

    public UserService(UserRepository userRepository, RoleRepository roleRepository) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
    }

    @Transactional(readOnly = true)
    public List<UserResponse> getAllUsers() {
        return userRepository.findAll().stream()
                .sorted(Comparator.comparing(User::getUsername, String.CASE_INSENSITIVE_ORDER))
                .map(UserResponse::from)
                .toList();
    }

    /** Đặt vai trò duy nhất cho tài khoản. Không cho tự đổi vai trò của mình hay bỏ quyền quản trị viên cuối cùng. */
    public UserResponse changeRole(Long id, String roleName, String actorUsername) {
        User user = findUser(id);
        rejectSelfChange(user, actorUsername);

        Role role = roleRepository.findByName(roleName)
                .orElseThrow(() -> new BadRequestException("ROLE_NOT_FOUND", "Vai trò không tồn tại: " + roleName));

        if (isActiveAdmin(user) && !ADMIN_ROLE.equals(roleName)) {
            requireAnotherActiveAdmin(user);
        }

        Set<Role> roles = new HashSet<>();
        roles.add(role);
        user.setRoles(roles);
        return UserResponse.from(userRepository.save(user));
    }

    /** Bật hoặc khóa tài khoản. Không cho tự khóa mình hay khóa quản trị viên cuối cùng. */
    public UserResponse changeStatus(Long id, boolean active, String actorUsername) {
        User user = findUser(id);
        rejectSelfChange(user, actorUsername);

        if (!active && isActiveAdmin(user)) {
            requireAnotherActiveAdmin(user);
        }

        user.setActive(active);
        return UserResponse.from(userRepository.save(user));
    }

    private User findUser(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("USER_NOT_FOUND", "Không tìm thấy tài khoản với ID: " + id));
    }

    private void rejectSelfChange(User user, String actorUsername) {
        if (user.getUsername().equals(actorUsername)) {
            throw new ConflictException("CANNOT_MODIFY_SELF",
                    "Không thể tự đổi vai trò hoặc khóa chính tài khoản của mình.");
        }
    }

    private boolean isActiveAdmin(User user) {
        return !Boolean.FALSE.equals(user.getActive())
                && user.getRoles().stream().anyMatch(r -> ADMIN_ROLE.equals(r.getName()));
    }

    private void requireAnotherActiveAdmin(User user) {
        if (userRepository.countActiveByRoleNameExcluding(ADMIN_ROLE, user.getId()) == 0) {
            throw new ConflictException("LAST_ADMIN",
                    "Hệ thống phải còn ít nhất một quản trị viên đang hoạt động.");
        }
    }
}

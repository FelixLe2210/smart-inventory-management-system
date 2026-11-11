package com.smartinventory.service;

import com.smartinventory.dto.UserResponse;
import com.smartinventory.exception.BadRequestException;
import com.smartinventory.exception.ConflictException;
import com.smartinventory.exception.NotFoundException;
import com.smartinventory.model.Role;
import com.smartinventory.model.User;
import com.smartinventory.repository.RoleRepository;
import com.smartinventory.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private RoleRepository roleRepository;

    @InjectMocks
    private UserService userService;

    private Role role(String name) {
        Role role = new Role();
        role.setName(name);
        return role;
    }

    private User user(Long id, String username, boolean active, String... roleNames) {
        User user = new User();
        ReflectionTestUtils.setField(user, "id", id);
        user.setUsername(username);
        user.setEmail(username + "@example.com");
        user.setActive(active);
        Set<Role> roles = new HashSet<>();
        for (String name : roleNames) {
            roles.add(role(name));
        }
        user.setRoles(roles);
        return user;
    }

    @Test
    @DisplayName("Danh sách tài khoản được sắp theo tên đăng nhập, không phân biệt hoa thường")
    void listIsSortedByUsername() {
        when(userRepository.findAll()).thenReturn(List.of(
                user(1L, "zoe", true, "STAFF"),
                user(2L, "Admin", true, "ADMIN"),
                user(3L, "bob", false, "VIEWER")));

        List<UserResponse> result = userService.getAllUsers();

        assertEquals(List.of("Admin", "bob", "zoe"), result.stream().map(UserResponse::username).toList());
        assertFalse(result.get(1).active());
        assertEquals(List.of("ADMIN"), result.get(0).roles());
    }

    @Test
    @DisplayName("Đổi vai trò: thay toàn bộ vai trò cũ bằng vai trò mới")
    void changeRoleReplacesRoles() {
        User target = user(5L, "lan", true, "VIEWER");
        when(userRepository.findById(5L)).thenReturn(Optional.of(target));
        when(roleRepository.findByName("STAFF")).thenReturn(Optional.of(role("STAFF")));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        UserResponse result = userService.changeRole(5L, "STAFF", "admin");

        assertEquals(List.of("STAFF"), result.roles());
        verify(userRepository).save(target);
    }

    @Test
    @DisplayName("Không được tự đổi vai trò của chính mình")
    void cannotChangeOwnRole() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(user(1L, "admin", true, "ADMIN")));

        ConflictException ex = assertThrows(ConflictException.class,
                () -> userService.changeRole(1L, "VIEWER", "admin"));

        assertEquals("CANNOT_MODIFY_SELF", ex.getCode());
        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("Không được tự khóa chính mình")
    void cannotDisableSelf() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(user(1L, "admin", true, "ADMIN")));

        ConflictException ex = assertThrows(ConflictException.class,
                () -> userService.changeStatus(1L, false, "admin"));

        assertEquals("CANNOT_MODIFY_SELF", ex.getCode());
    }

    @Test
    @DisplayName("Không được hạ vai trò quản trị viên đang hoạt động cuối cùng")
    void cannotDemoteLastAdmin() {
        User lastAdmin = user(2L, "boss", true, "ADMIN");
        when(userRepository.findById(2L)).thenReturn(Optional.of(lastAdmin));
        when(roleRepository.findByName("MANAGER")).thenReturn(Optional.of(role("MANAGER")));
        when(userRepository.countActiveByRoleNameExcluding("ADMIN", 2L)).thenReturn(0L);

        ConflictException ex = assertThrows(ConflictException.class,
                () -> userService.changeRole(2L, "MANAGER", "someone-else"));

        assertEquals("LAST_ADMIN", ex.getCode());
        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("Hạ vai trò quản trị viên được phép khi còn quản trị viên khác đang hoạt động")
    void canDemoteAdminWhenAnotherExists() {
        User admin = user(2L, "boss", true, "ADMIN");
        when(userRepository.findById(2L)).thenReturn(Optional.of(admin));
        when(roleRepository.findByName("MANAGER")).thenReturn(Optional.of(role("MANAGER")));
        when(userRepository.countActiveByRoleNameExcluding("ADMIN", 2L)).thenReturn(1L);
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        UserResponse result = userService.changeRole(2L, "MANAGER", "admin");

        assertEquals(List.of("MANAGER"), result.roles());
    }

    @Test
    @DisplayName("Không được khóa quản trị viên đang hoạt động cuối cùng")
    void cannotDisableLastAdmin() {
        when(userRepository.findById(2L)).thenReturn(Optional.of(user(2L, "boss", true, "ADMIN")));
        when(userRepository.countActiveByRoleNameExcluding("ADMIN", 2L)).thenReturn(0L);

        ConflictException ex = assertThrows(ConflictException.class,
                () -> userService.changeStatus(2L, false, "someone-else"));

        assertEquals("LAST_ADMIN", ex.getCode());
    }

    @Test
    @DisplayName("Khóa và mở khóa tài khoản thường không cần kiểm tra quản trị viên cuối")
    void disableAndEnableRegularUser() {
        User staff = user(7L, "minh", true, "STAFF");
        when(userRepository.findById(7L)).thenReturn(Optional.of(staff));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        assertFalse(userService.changeStatus(7L, false, "admin").active());
        assertTrue(userService.changeStatus(7L, true, "admin").active());
        verify(userRepository, never()).countActiveByRoleNameExcluding(anyString(), anyLong());
    }

    @Test
    @DisplayName("Tài khoản không tồn tại trả NotFound")
    void unknownUser() {
        when(userRepository.findById(99L)).thenReturn(Optional.empty());

        NotFoundException ex = assertThrows(NotFoundException.class,
                () -> userService.changeStatus(99L, false, "admin"));

        assertEquals("USER_NOT_FOUND", ex.getCode());
    }

    @Test
    @DisplayName("Vai trò chưa có trong cơ sở dữ liệu trả BadRequest")
    void unknownRole() {
        when(userRepository.findById(5L)).thenReturn(Optional.of(user(5L, "lan", true, "VIEWER")));
        when(roleRepository.findByName("STAFF")).thenReturn(Optional.empty());

        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> userService.changeRole(5L, "STAFF", "admin"));

        assertEquals("ROLE_NOT_FOUND", ex.getCode());
    }
}

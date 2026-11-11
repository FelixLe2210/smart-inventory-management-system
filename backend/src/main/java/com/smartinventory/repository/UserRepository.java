package com.smartinventory.repository;

import com.smartinventory.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByUsername(String username);

    Optional<User> findByEmail(String email);

    Optional<User> findByPhone(String phone);

    boolean existsByUsername(String username);

    boolean existsByEmail(String email);

    /** Số tài khoản đang hoạt động có vai trò này, loại trừ một tài khoản (dùng để giữ lại ít nhất một quản trị viên). */
    @Query("select count(distinct u) from User u join u.roles r "
            + "where u.active = true and r.name = :roleName and u.id <> :excludedId")
    long countActiveByRoleNameExcluding(@Param("roleName") String roleName,
                                        @Param("excludedId") Long excludedId);
}

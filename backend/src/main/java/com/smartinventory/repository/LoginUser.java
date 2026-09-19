package com.smartinventory.repository;

public record LoginUser(
        int id,
        String username,
        String email,
        String passwordHash
) {
}
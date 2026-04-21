package com.vims.repository;

import com.vims.entity.User;
import com.vims.enums.Role;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);
    List<User> findByRole(Role role);
    List<User> findByRoleAndEnabled(Role role, boolean enabled);
    List<User> findByTenantId(UUID tenantId);
    List<User> findByTenantIdAndRoleAndEnabled(UUID tenantId, Role role, boolean enabled);
    List<User> findByTenantIdAndRole(UUID tenantId, Role role);
}

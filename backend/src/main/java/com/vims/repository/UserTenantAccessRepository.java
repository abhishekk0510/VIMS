package com.vims.repository;

import com.vims.entity.UserTenantAccess;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

public interface UserTenantAccessRepository extends JpaRepository<UserTenantAccess, UUID> {
    List<UserTenantAccess> findByUserId(UUID userId);
    boolean existsByUserIdAndTenantId(UUID userId, UUID tenantId);

    @Transactional
    void deleteByUserId(UUID userId);
}

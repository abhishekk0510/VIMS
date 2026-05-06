package com.vims.repository;

import com.vims.entity.UserModulePermission;
import com.vims.enums.ModuleKey;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

public interface UserModulePermissionRepository extends JpaRepository<UserModulePermission, UUID> {
    List<UserModulePermission> findByUserId(UUID userId);

    @Transactional
    void deleteByUserIdAndModuleKey(UUID userId, ModuleKey moduleKey);

    @Transactional
    void deleteByUserId(UUID userId);
}

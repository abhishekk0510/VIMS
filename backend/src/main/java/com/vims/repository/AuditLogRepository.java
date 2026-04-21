package com.vims.repository;

import com.vims.entity.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, UUID> {

    List<AuditLog> findAllByOrderByCreatedAtDesc();

    List<AuditLog> findByEventTypeIgnoreCaseOrderByCreatedAtDesc(String eventType);

    List<AuditLog> findByTenantIdOrderByCreatedAtDesc(UUID tenantId);

    List<AuditLog> findByTenantIdAndEventTypeIgnoreCaseOrderByCreatedAtDesc(UUID tenantId, String eventType);
}

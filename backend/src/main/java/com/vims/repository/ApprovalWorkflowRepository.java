package com.vims.repository;

import com.vims.entity.ApprovalWorkflow;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ApprovalWorkflowRepository extends JpaRepository<ApprovalWorkflow, UUID> {
    Optional<ApprovalWorkflow> findByIsActiveTrue();
    boolean existsByIsActiveTrue();
    Optional<ApprovalWorkflow> findByTenantIdAndIsActiveTrue(UUID tenantId);
    List<ApprovalWorkflow> findByTenantId(UUID tenantId);
}

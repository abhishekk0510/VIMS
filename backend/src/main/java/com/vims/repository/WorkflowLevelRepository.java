package com.vims.repository;

import com.vims.entity.WorkflowLevel;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface WorkflowLevelRepository extends JpaRepository<WorkflowLevel, UUID> {
    List<WorkflowLevel> findByWorkflowIdOrderByLevelOrderAsc(UUID workflowId);
    Optional<WorkflowLevel> findByWorkflowIdAndLevelOrder(UUID workflowId, int levelOrder);
    int countByWorkflowId(UUID workflowId);
    void deleteByWorkflowId(UUID workflowId);
}

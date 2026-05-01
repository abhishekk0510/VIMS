package com.vims.service;

import com.vims.config.TenantContext;
import com.vims.dto.request.InvoiceRequests.*;
import com.vims.dto.response.Responses.*;
import com.vims.entity.ApprovalWorkflow;
import com.vims.entity.WorkflowLevel;
import com.vims.exception.BusinessException;
import com.vims.exception.ResourceNotFoundException;
import com.vims.repository.ApprovalWorkflowRepository;
import com.vims.repository.WorkflowLevelRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

@Service
@RequiredArgsConstructor
public class WorkflowService {

    private final ApprovalWorkflowRepository workflowRepository;
    private final WorkflowLevelRepository levelRepository;

    @Transactional(readOnly = true)
    public List<WorkflowDto> getAllWorkflows() {
        UUID tenantId = TenantContext.get();
        if (tenantId != null) {
            return workflowRepository.findByTenantId(tenantId).stream()
                    .map(this::toDto)
                    .collect(Collectors.toList());
        }
        return workflowRepository.findAll().stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public WorkflowDto getActiveWorkflow() {
        UUID tenantId = TenantContext.get();
        if (tenantId != null) {
            return workflowRepository.findByTenantIdAndIsActiveTrue(tenantId)
                    .map(this::toDto)
                    .orElseThrow(() -> new BusinessException("No active approval workflow configured"));
        }
        return workflowRepository.findByIsActiveTrue()
                .map(this::toDto)
                .orElseThrow(() -> new BusinessException("No active approval workflow configured"));
    }

    @Transactional(readOnly = true)
    public Optional<ApprovalWorkflow> findActiveWorkflow() {
        return workflowRepository.findByIsActiveTrue();
    }

    @Transactional(readOnly = true)
    public Optional<ApprovalWorkflow> findActiveWorkflow(UUID tenantId) {
        return workflowRepository.findByTenantIdAndIsActiveTrue(tenantId);
    }

    @Transactional(readOnly = true)
    public Optional<WorkflowLevel> getLevel(UUID workflowId, int levelOrder) {
        return levelRepository.findByWorkflowIdAndLevelOrder(workflowId, levelOrder);
    }

    @Transactional(readOnly = true)
    public List<WorkflowLevel> getLevelsSorted(UUID workflowId) {
        return levelRepository.findByWorkflowIdOrderByLevelOrderAsc(workflowId);
    }

    @Transactional(readOnly = true)
    public int getTotalLevels(UUID workflowId) {
        return levelRepository.countByWorkflowId(workflowId);
    }

    @Transactional
    public WorkflowDto createWorkflow(CreateWorkflowRequest req) {
        UUID tenantId = TenantContext.get();
        if (tenantId == null) {
            throw new BusinessException("SUPER_ADMIN must use a tenant-scoped account to create workflows");
        }
        ApprovalWorkflow workflow = ApprovalWorkflow.builder()
                .name(req.getName())
                .description(req.getDescription())
                .tenantId(tenantId)
                .isActive(false)
                .build();

        workflowRepository.save(workflow);
        saveLevels(workflow, req.getLevels());

        // Reload to get levels populated
        return toDto(workflowRepository.findById(workflow.getId()).orElseThrow());
    }

    @Transactional
    public WorkflowDto updateWorkflow(UUID id, UpdateWorkflowRequest req) {
        ApprovalWorkflow workflow = workflowRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Workflow not found: " + id));

        workflow.setName(req.getName());
        workflow.setDescription(req.getDescription());

        // Replace all levels
        workflow.getLevels().clear();
        workflowRepository.save(workflow);
        saveLevels(workflow, req.getLevels());

        return toDto(workflowRepository.findById(id).orElseThrow());
    }

    @Transactional
    public WorkflowDto activateWorkflow(UUID id) {
        ApprovalWorkflow target = workflowRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Workflow not found: " + id));

        if (target.getLevels().isEmpty()) {
            throw new BusinessException("Cannot activate a workflow with no levels");
        }

        // Deactivate currently active workflow for this tenant
        UUID tenantId = target.getTenantId();
        workflowRepository.findByTenantIdAndIsActiveTrue(tenantId).ifPresent(current -> {
            if (!current.getId().equals(target.getId())) {
                current.setIsActive(false);
                workflowRepository.save(current);
            }
        });

        target.setIsActive(true);
        workflowRepository.save(target);
        return toDto(target);
    }

    @Transactional
    public void deleteWorkflow(UUID id) {
        ApprovalWorkflow workflow = workflowRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Workflow not found: " + id));
        if (Boolean.TRUE.equals(workflow.getIsActive())) {
            throw new BusinessException("Cannot delete the active workflow");
        }
        workflowRepository.delete(workflow);
    }

    // ─── Helpers ────────────────────────────────────────────────────────────────

    private void saveLevels(ApprovalWorkflow workflow, List<WorkflowLevelRequest> levelRequests) {
        List<WorkflowLevel> levels = IntStream.range(0, levelRequests.size())
                .mapToObj(i -> {
                    WorkflowLevelRequest r = levelRequests.get(i);
                    return WorkflowLevel.builder()
                            .workflow(workflow)
                            .levelOrder(i + 1)
                            .levelName(r.getLevelName())
                            .approverRole(r.getApproverRole())
                            .minAmount(r.getMinAmount())
                            .maxAmount(r.getMaxAmount())
                            .build();
                })
                .collect(Collectors.toList());
        levelRepository.saveAll(levels);
    }

    public WorkflowDto toDto(ApprovalWorkflow w) {
        List<WorkflowLevelDto> levels = w.getLevels().stream()
                .map(l -> WorkflowLevelDto.builder()
                        .id(l.getId())
                        .levelOrder(l.getLevelOrder())
                        .levelName(l.getLevelName())
                        .approverRole(l.getApproverRole())
                        .minAmount(l.getMinAmount())
                        .maxAmount(l.getMaxAmount())
                        .build())
                .collect(Collectors.toList());

        return WorkflowDto.builder()
                .id(w.getId())
                .name(w.getName())
                .description(w.getDescription())
                .isActive(Boolean.TRUE.equals(w.getIsActive()))
                .levels(levels)
                .createdAt(w.getCreatedAt())
                .updatedAt(w.getUpdatedAt())
                .build();
    }
}

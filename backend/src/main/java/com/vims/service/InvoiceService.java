package com.vims.service;

import com.vims.config.TenantContext;
import com.vims.dto.request.InvoiceRequests.*;
import com.vims.dto.response.Responses.*;
import com.vims.entity.*;
import com.vims.enums.InvoiceStatus;
import com.vims.enums.Role;
import com.vims.exception.*;
import com.vims.repository.*;
import com.vims.service.storage.StorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class InvoiceService {

    private final InvoiceRepository invoiceRepository;
    private final UserRepository userRepository;
    private final ApprovalHistoryRepository historyRepository;
    private final WorkflowService workflowService;
    private final NotificationService notificationService;
    private final AiService aiService;
    private final OcrService ocrService;
    private final AuditLogService auditLogService;
    private final StorageService storageService;

    @Value("${file.allowed-types}")
    private String allowedTypes;

    @Transactional
    public InvoiceDto createInvoice(String vendorEmail, CreateInvoiceRequest req, MultipartFile file) {
        UUID tenantId = TenantContext.get();
        if (tenantId == null) {
            throw new BusinessException("SUPER_ADMIN cannot directly create invoices. Use a tenant-scoped account.");
        }

        User vendor = getUser(vendorEmail);

        if (invoiceRepository.existsByInvoiceNumber(req.getInvoiceNumber())) {
            throw new BusinessException("Invoice number already exists");
        }

        Invoice invoice = Invoice.builder()
                .invoiceNumber(req.getInvoiceNumber())
                .vendor(vendor)
                .invoiceDate(req.getInvoiceDate())
                .amount(req.getAmount())
                .clientName(req.getClientName())
                .description(req.getDescription())
                .status(InvoiceStatus.DRAFT)
                .tenantId(tenantId)
                .build();

        if (file != null && !file.isEmpty()) {
            saveFile(invoice, file);
        }

        invoiceRepository.save(invoice);
        ocrService.extractAndAnalyzeAsync(invoice.getId());
        return toDto(invoice, false);
    }

    @Transactional
    public InvoiceDto submitInvoice(String vendorEmail, UUID invoiceId) {
        UUID tenantId = TenantContext.get();
        Invoice invoice = getInvoice(invoiceId);
        User vendor = getUser(vendorEmail);

        if (!invoice.getVendor().getId().equals(vendor.getId())) {
            throw new AccessDeniedException("Not your invoice");
        }
        if (tenantId != null && !invoice.getTenantId().equals(tenantId)) {
            throw new AccessDeniedException("Invoice does not belong to your tenant");
        }
        if (invoice.getStatus() != InvoiceStatus.DRAFT && invoice.getStatus() != InvoiceStatus.REJECTED) {
            throw new BusinessException("Invoice cannot be submitted in current state: " + invoice.getStatus());
        }

        ApprovalWorkflow workflow = (tenantId != null
                ? workflowService.findActiveWorkflow(tenantId)
                : workflowService.findActiveWorkflow())
                .orElseThrow(() -> new BusinessException("No active approval workflow configured. Please contact Admin."));

        invoice.setStatus(InvoiceStatus.PENDING_APPROVAL);
        invoice.setWorkflowId(workflow.getId());
        invoice.setCurrentApprovalStep(1);
        invoiceRepository.save(invoice);

        logHistory(invoice, vendor, InvoiceStatus.PENDING_APPROVAL, "Invoice submitted for approval");
        auditLogService.log("INVOICE_SUBMITTED", vendor.getName(), vendor.getRole().name(),
                "Invoice " + invoice.getInvoiceNumber() + " submitted for approval", invoice.getInvoiceNumber());
        WorkflowLevel firstLevel = workflowService.getLevel(workflow.getId(), 1)
                .orElseThrow(() -> new BusinessException("Workflow has no levels configured"));
        notificationService.notifyInvoiceSubmitted(invoice, vendor.getName(), firstLevel);
        return toDto(invoice, true);
    }

    @Transactional
    public InvoiceDto processApproval(String userEmail, UUID invoiceId, ApprovalRequest req) {
        Invoice invoice = getInvoice(invoiceId);
        User actor = getUser(userEmail);

        if (invoice.getStatus() != InvoiceStatus.PENDING_APPROVAL) {
            throw new BusinessException("Invoice is not pending approval");
        }
        if (invoice.getWorkflowId() == null || invoice.getCurrentApprovalStep() == null) {
            throw new BusinessException("Invoice has no workflow assigned");
        }

        WorkflowLevel currentLevel = workflowService
                .getLevel(invoice.getWorkflowId(), invoice.getCurrentApprovalStep())
                .orElseThrow(() -> new BusinessException("Workflow configuration error: level not found"));

        if (actor.getRole() != currentLevel.getApproverRole() && actor.getRole() != Role.ADMIN) {
            throw new BusinessException(
                    "You cannot act on this invoice. Required role: " + currentLevel.getApproverRole());
        }

        boolean approve = "APPROVE".equalsIgnoreCase(req.getAction());

        if (approve) {
            int totalLevels = workflowService.getTotalLevels(invoice.getWorkflowId());
            if (invoice.getCurrentApprovalStep() < totalLevels) {
                // Move to next level
                invoice.setCurrentApprovalStep(invoice.getCurrentApprovalStep() + 1);
                logHistory(invoice, actor, InvoiceStatus.PENDING_APPROVAL, req.getRemarks());
                auditLogService.log("INVOICE_APPROVED_LEVEL", actor.getName(), actor.getRole().name(),
                        "Invoice " + invoice.getInvoiceNumber() + " approved at " + currentLevel.getLevelName(), invoice.getInvoiceNumber());
                invoiceRepository.save(invoice);
                // Force-load vendor before async notification (avoids LazyInitializationException)
                String vendorName = invoice.getVendor().getName();
                workflowService.getLevel(invoice.getWorkflowId(), invoice.getCurrentApprovalStep())
                        .ifPresent(nextLevel -> notificationService.notifyLevelApproved(
                                invoice, vendorName, actor.getName(), currentLevel, nextLevel));
            } else {
                // Final level approved
                invoice.setStatus(InvoiceStatus.APPROVED);
                logHistory(invoice, actor, InvoiceStatus.APPROVED, req.getRemarks());
                auditLogService.log("INVOICE_FULLY_APPROVED", actor.getName(), actor.getRole().name(),
                        "Invoice " + invoice.getInvoiceNumber() + " fully approved by " + currentLevel.getLevelName(), invoice.getInvoiceNumber());
                invoiceRepository.save(invoice);
                String vendorName = invoice.getVendor().getName();
                String vendorEmail = invoice.getVendor().getEmail();
                notificationService.notifyFinalApproved(invoice, vendorName, vendorEmail, actor.getName(), currentLevel);
            }
        } else {
            // Rejection — vendor must fix and resubmit
            invoice.setStatus(InvoiceStatus.REJECTED);
            invoice.setRejectionRemarks(req.getRemarks());
            logHistory(invoice, actor, InvoiceStatus.REJECTED, req.getRemarks());
            auditLogService.log("INVOICE_REJECTED", actor.getName(), actor.getRole().name(),
                    "Invoice " + invoice.getInvoiceNumber() + " rejected at " + currentLevel.getLevelName(), invoice.getInvoiceNumber());
            invoiceRepository.save(invoice);
            String vendorName = invoice.getVendor().getName();
            String vendorEmail = invoice.getVendor().getEmail();
            notificationService.notifyRejected(invoice, vendorName, vendorEmail, actor.getName(), currentLevel, req.getRemarks());
        }

        return toDto(invoice, true);
    }

    @Transactional
    public InvoiceDto markPaid(String userEmail, UUID invoiceId, String remarks) {
        Invoice invoice = getInvoice(invoiceId);
        User actor = getUser(userEmail);

        if (actor.getRole() != Role.FINANCE && actor.getRole() != Role.ADMIN) {
            throw new BusinessException("Only Finance or Admin can mark as paid");
        }
        if (invoice.getStatus() != InvoiceStatus.APPROVED) {
            throw new BusinessException("Invoice must be APPROVED before marking paid");
        }

        invoice.setStatus(InvoiceStatus.PAID);
        invoiceRepository.save(invoice);
        logHistory(invoice, actor, InvoiceStatus.PAID, remarks);
        auditLogService.log("INVOICE_PAID", actor.getName(), actor.getRole().name(),
                "Invoice " + invoice.getInvoiceNumber() + " marked as paid", invoice.getInvoiceNumber());
        String vendorName = invoice.getVendor().getName();
        String vendorEmail = invoice.getVendor().getEmail();
        notificationService.notifyPaymentDone(invoice, vendorName, vendorEmail, actor.getName());
        return toDto(invoice, true);
    }

    @Transactional(readOnly = true)
    public PagedResponse<InvoiceDto> getInvoices(String userEmail,
                                                  InvoiceStatus status,
                                                  LocalDate from, LocalDate to,
                                                  String clientName,
                                                  int page, int size) {
        UUID tenantId = TenantContext.get(); // null for SUPER_ADMIN
        User user = getUser(userEmail);
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());

        UUID vendorId = user.getRole() == Role.VENDOR ? user.getId() : null;
        Page<Invoice> result = invoiceRepository.findWithFilters(tenantId, vendorId, status, from, to, clientName, pageable);

        List<InvoiceDto> dtos = result.getContent().stream()
                .map(i -> toDto(i, false)).collect(Collectors.toList());

        return PagedResponse.<InvoiceDto>builder()
                .content(dtos).page(page).size(size)
                .totalElements(result.getTotalElements())
                .totalPages(result.getTotalPages())
                .last(result.isLast())
                .build();
    }

    @Transactional(readOnly = true)
    public FileDownload downloadFile(String userEmail, UUID id) {
        User user = getUser(userEmail);
        Invoice invoice = getInvoice(id);

        if (user.getRole() == Role.VENDOR && !invoice.getVendor().getId().equals(user.getId())) {
            throw new BusinessException("Access denied");
        }
        if (invoice.getFilePath() == null || invoice.getFilePath().isBlank()) {
            throw new ResourceNotFoundException("No file attached to this invoice");
        }
        try {
            var resource = storageService.load(invoice.getFilePath());
            String filename = invoice.getFileName() != null ? invoice.getFileName() : "invoice";
            return new FileDownload(resource, filename);
        } catch (IOException e) {
            throw new ResourceNotFoundException("File not found on server");
        }
    }

    @Transactional(readOnly = true)
    public InvoiceDto getInvoiceById(String userEmail, UUID id) {
        User user = getUser(userEmail);
        Invoice invoice = getInvoice(id);

        if (user.getRole() == Role.VENDOR && !invoice.getVendor().getId().equals(user.getId())) {
            throw new BusinessException("Access denied");
        }
        return toDto(invoice, true);
    }

    @Transactional(readOnly = true)
    public DashboardDto getDashboard(String userEmail) {
        UUID tenantId = TenantContext.get(); // null for SUPER_ADMIN
        User user = getUser(userEmail);

        if (user.getRole() == Role.VENDOR) {
            UUID vid = user.getId();
            return DashboardDto.builder()
                    .totalInvoices(invoiceRepository.countByVendorId(vid))
                    .draft(invoiceRepository.countByVendorIdAndStatus(vid, InvoiceStatus.DRAFT))
                    .pendingApproval(invoiceRepository.countByVendorIdAndStatus(vid, InvoiceStatus.PENDING_APPROVAL))
                    .approved(invoiceRepository.countByVendorIdAndStatus(vid, InvoiceStatus.APPROVED))
                    .rejected(invoiceRepository.countByVendorIdAndStatus(vid, InvoiceStatus.REJECTED))
                    .paid(invoiceRepository.countByVendorIdAndStatus(vid, InvoiceStatus.PAID))
                    .totalApprovedAmount(invoiceRepository.sumAmountByVendorIdAndStatus(vid, InvoiceStatus.APPROVED))
                    .totalPaidAmount(invoiceRepository.sumAmountByVendorIdAndStatus(vid, InvoiceStatus.PAID))
                    .build();
        }

        // SUPER_ADMIN sees all data; tenant-scoped roles see only their tenant
        if (tenantId != null) {
            return DashboardDto.builder()
                    .totalInvoices(invoiceRepository.countByTenantId(tenantId))
                    .draft(invoiceRepository.countByTenantIdAndStatus(tenantId, InvoiceStatus.DRAFT))
                    .pendingApproval(invoiceRepository.countByTenantIdAndStatus(tenantId, InvoiceStatus.PENDING_APPROVAL))
                    .approved(invoiceRepository.countByTenantIdAndStatus(tenantId, InvoiceStatus.APPROVED))
                    .rejected(invoiceRepository.countByTenantIdAndStatus(tenantId, InvoiceStatus.REJECTED))
                    .paid(invoiceRepository.countByTenantIdAndStatus(tenantId, InvoiceStatus.PAID))
                    .totalApprovedAmount(invoiceRepository.sumAmountByTenantIdAndStatus(tenantId, InvoiceStatus.APPROVED))
                    .totalPaidAmount(invoiceRepository.sumAmountByTenantIdAndStatus(tenantId, InvoiceStatus.PAID))
                    .build();
        }

        // SUPER_ADMIN: see global counts
        return DashboardDto.builder()
                .totalInvoices(invoiceRepository.count())
                .draft(invoiceRepository.countByStatus(InvoiceStatus.DRAFT))
                .pendingApproval(invoiceRepository.countByStatus(InvoiceStatus.PENDING_APPROVAL))
                .approved(invoiceRepository.countByStatus(InvoiceStatus.APPROVED))
                .rejected(invoiceRepository.countByStatus(InvoiceStatus.REJECTED))
                .paid(invoiceRepository.countByStatus(InvoiceStatus.PAID))
                .totalApprovedAmount(invoiceRepository.sumAmountByStatus(InvoiceStatus.APPROVED))
                .totalPaidAmount(invoiceRepository.sumAmountByStatus(InvoiceStatus.PAID))
                .build();
    }

    @Transactional(readOnly = true)
    public ExpenseSummaryDto getExpenseSummary() {
        UUID tenantId = TenantContext.get();
        List<InvoiceStatus> unapprovedStatuses = Arrays.asList(
                InvoiceStatus.DRAFT, InvoiceStatus.PENDING_APPROVAL, InvoiceStatus.REJECTED);

        List<Invoice> allInvoices = (tenantId != null)
                ? invoiceRepository.findByTenantId(tenantId)
                : invoiceRepository.findAll();

        BigDecimal unapprovedTotal = allInvoices.stream()
                .filter(i -> unapprovedStatuses.contains(i.getStatus()))
                .map(Invoice::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        Map<InvoiceStatus, List<Invoice>> grouped = allInvoices.stream()
                .collect(Collectors.groupingBy(Invoice::getStatus));

        List<StatusGroupDto> byStatus = Arrays.stream(InvoiceStatus.values())
                .map(status -> {
                    List<Invoice> group = grouped.getOrDefault(status, Collections.emptyList());
                    BigDecimal groupTotal = group.stream()
                            .map(Invoice::getAmount)
                            .reduce(BigDecimal.ZERO, BigDecimal::add);
                    List<InvoiceDto> dtos = group.stream()
                            .map(i -> toDto(i, false))
                            .collect(Collectors.toList());
                    return StatusGroupDto.builder()
                            .status(status.name())
                            .count(group.size())
                            .total(groupTotal)
                            .invoices(dtos)
                            .build();
                })
                .collect(Collectors.toList());

        return ExpenseSummaryDto.builder()
                .unapprovedSpendTotal(unapprovedTotal)
                .byStatus(byStatus)
                .build();
    }

    // ─── Private helpers ────────────────────────────────────────────────────────

    private void saveFile(Invoice invoice, MultipartFile file) {
        String contentType = file.getContentType();
        if (!Arrays.asList(allowedTypes.split(",")).contains(contentType)) {
            throw new BusinessException("File type not allowed: " + contentType);
        }
        try {
            String fileRef = storageService.save(file);
            invoice.setFilePath(fileRef);
            invoice.setFileName(file.getOriginalFilename());
            invoice.setFileType(contentType);
        } catch (IOException e) {
            throw new BusinessException("File upload failed");
        }
    }

    private void logHistory(Invoice inv, User actor, InvoiceStatus status, String remarks) {
        ApprovalHistory h = ApprovalHistory.builder()
                .invoice(inv).actionBy(actor)
                .role(actor.getRole())
                .statusAfter(status.name())
                .remarks(remarks)
                .build();
        historyRepository.save(h);
    }

    private Invoice getInvoice(UUID id) {
        return invoiceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Invoice not found: " + id));
    }

    private User getUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    private InvoiceDto toDto(Invoice i, boolean includeHistory) {
        List<ApprovalHistoryDto> history = null;
        if (includeHistory) {
            history = historyRepository.findByInvoiceOrderByCreatedAtAsc(i).stream()
                    .map(h -> ApprovalHistoryDto.builder()
                            .id(h.getId())
                            .actionBy(UserDto.builder().id(h.getActionBy().getId())
                                    .name(h.getActionBy().getName())
                                    .role(h.getActionBy().getRole()).build())
                            .role(h.getRole())
                            .statusAfter(h.getStatusAfter())
                            .remarks(h.getRemarks())
                            .createdAt(h.getCreatedAt())
                            .build())
                    .collect(Collectors.<ApprovalHistoryDto>toList());
        }

        // Resolve current step info from workflow
        String currentStepName = null;
        Role currentStepRole = null;
        String workflowName = null;
        Integer totalApprovalSteps = null;

        if (i.getWorkflowId() != null && i.getCurrentApprovalStep() != null
                && i.getStatus() == InvoiceStatus.PENDING_APPROVAL) {
            totalApprovalSteps = workflowService.getTotalLevels(i.getWorkflowId());
            var levelOpt = workflowService.getLevel(i.getWorkflowId(), i.getCurrentApprovalStep());
            if (levelOpt.isPresent()) {
                currentStepName = levelOpt.get().getLevelName();
                currentStepRole = levelOpt.get().getApproverRole();
            }
        }

        // Fetch all workflow levels for the dynamic tracker (detail view only)
        List<WorkflowLevelDto> workflowLevels = null;
        if (includeHistory && i.getWorkflowId() != null) {
            workflowLevels = workflowService.getLevelsSorted(i.getWorkflowId()).stream()
                    .map(l -> WorkflowLevelDto.builder()
                            .levelOrder(l.getLevelOrder())
                            .levelName(l.getLevelName())
                            .approverRole(l.getApproverRole())
                            .build())
                    .collect(Collectors.toList());
        }

        return InvoiceDto.builder()
                .id(i.getId()).invoiceNumber(i.getInvoiceNumber())
                .vendor(UserDto.builder().id(i.getVendor().getId())
                        .name(i.getVendor().getName()).email(i.getVendor().getEmail())
                        .role(i.getVendor().getRole()).build())
                .invoiceDate(i.getInvoiceDate()).amount(i.getAmount())
                .clientName(i.getClientName()).description(i.getDescription())
                .status(i.getStatus()).fileName(i.getFileName())
                .rejectionRemarks(i.getRejectionRemarks())
                .currentApprovalStep(i.getCurrentApprovalStep())
                .totalApprovalSteps(totalApprovalSteps)
                .currentStepName(currentStepName)
                .currentStepRole(currentStepRole)
                .workflowName(workflowName)
                .workflowLevels(workflowLevels)
                .ocrText(i.getOcrText())
                .aiAnalysis(i.getAiAnalysis()).aiAnomalyFlag(i.getAiAnomalyFlag())
                .aiRiskScore(i.getAiRiskScore())
                .createdAt(i.getCreatedAt()).updatedAt(i.getUpdatedAt())
                .history(history).build();
    }

    private static class AccessDeniedException extends BusinessException {
        AccessDeniedException(String msg) { super(msg); }
    }
}

package com.vims.service;

import com.vims.config.TenantContext;
import com.vims.dto.request.InvoiceRequests.ApprovalRequest;
import com.vims.dto.request.InvoiceRequests.CreateInvoiceRequest;
import com.vims.dto.response.Responses.InvoiceDto;
import com.vims.entity.*;
import com.vims.enums.InvoiceStatus;
import com.vims.enums.Role;
import com.vims.exception.BusinessException;
import com.vims.exception.ResourceNotFoundException;
import com.vims.repository.*;
import com.vims.service.storage.StorageService;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;

import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class InvoiceServiceTest {

    @Mock InvoiceRepository invoiceRepository;
    @Mock UserRepository userRepository;
    @Mock ApprovalHistoryRepository historyRepository;
    @Mock WorkflowService workflowService;
    @Mock NotificationService notificationService;
    @Mock AiService aiService;
    @Mock OcrService ocrService;
    @Mock AuditLogService auditLogService;
    @Mock StorageService storageService;

    @InjectMocks
    InvoiceService invoiceService;

    private UUID tenantId;
    private User vendor;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(invoiceService, "allowedTypes",
                "application/pdf,image/jpeg,image/png");
        tenantId = UUID.randomUUID();
        TenantContext.set(tenantId);
        vendor = User.builder()
                .id(UUID.randomUUID())
                .email("vendor@test.com")
                .name("Test Vendor")
                .role(Role.VENDOR)
                .tenantId(tenantId)
                .build();
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    // ── createInvoice ─────────────────────────────────────────────────────────

    @Test
    void createInvoice_noFile_savesInvoiceAndReturnsDto() {
        when(userRepository.findByEmail("vendor@test.com")).thenReturn(Optional.of(vendor));
        when(invoiceRepository.existsByInvoiceNumber("INV-001")).thenReturn(false);
        when(invoiceRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        InvoiceDto result = invoiceService.createInvoice("vendor@test.com", buildRequest("INV-001"), null);

        assertThat(result).isNotNull();
        assertThat(result.getInvoiceNumber()).isEqualTo("INV-001");
        assertThat(result.getStatus()).isEqualTo(InvoiceStatus.DRAFT);
        verify(invoiceRepository).save(any());
        verify(ocrService).extractAndAnalyzeAsync(any());
        verifyNoInteractions(storageService);
    }

    @Test
    void createInvoice_withPdfFile_callsStorageAndSetsFilePath() throws IOException {
        MockMultipartFile pdf = new MockMultipartFile(
                "file", "invoice.pdf", "application/pdf", "pdf-content".getBytes());

        when(userRepository.findByEmail("vendor@test.com")).thenReturn(Optional.of(vendor));
        when(invoiceRepository.existsByInvoiceNumber("INV-002")).thenReturn(false);
        when(storageService.save(pdf)).thenReturn("/uploads/uuid_invoice.pdf");
        when(invoiceRepository.save(any())).thenAnswer(inv -> {
            Invoice i = inv.getArgument(0);
            assertThat(i.getFilePath()).isEqualTo("/uploads/uuid_invoice.pdf");
            assertThat(i.getFileName()).isEqualTo("invoice.pdf");
            assertThat(i.getFileType()).isEqualTo("application/pdf");
            return i;
        });

        invoiceService.createInvoice("vendor@test.com", buildRequest("INV-002"), pdf);

        verify(storageService).save(pdf);
    }

    @Test
    void createInvoice_duplicateInvoiceNumber_throwsBusinessException() {
        when(userRepository.findByEmail("vendor@test.com")).thenReturn(Optional.of(vendor));
        when(invoiceRepository.existsByInvoiceNumber("INV-DUP")).thenReturn(true);

        assertThatThrownBy(() ->
                invoiceService.createInvoice("vendor@test.com", buildRequest("INV-DUP"), null))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("already exists");
    }

    @Test
    void createInvoice_disallowedFileType_throwsBusinessException() {
        MockMultipartFile exe = new MockMultipartFile(
                "file", "malware.exe", "application/octet-stream", new byte[]{1, 2, 3});

        when(userRepository.findByEmail("vendor@test.com")).thenReturn(Optional.of(vendor));
        when(invoiceRepository.existsByInvoiceNumber("INV-003")).thenReturn(false);

        assertThatThrownBy(() ->
                invoiceService.createInvoice("vendor@test.com", buildRequest("INV-003"), exe))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("File type not allowed");

        verifyNoInteractions(storageService);
    }

    @Test
    void createInvoice_storageFailure_throwsBusinessException() throws IOException {
        MockMultipartFile pdf = new MockMultipartFile(
                "file", "inv.pdf", "application/pdf", new byte[]{1});

        when(userRepository.findByEmail("vendor@test.com")).thenReturn(Optional.of(vendor));
        when(invoiceRepository.existsByInvoiceNumber("INV-004")).thenReturn(false);
        when(storageService.save(pdf)).thenThrow(new IOException("disk full"));

        assertThatThrownBy(() ->
                invoiceService.createInvoice("vendor@test.com", buildRequest("INV-004"), pdf))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("File upload failed");
    }

    @Test
    void createInvoice_superAdmin_throwsBusinessException() {
        TenantContext.clear(); // SUPER_ADMIN has no tenant → guard throws before DB call

        assertThatThrownBy(() ->
                invoiceService.createInvoice("superadmin@test.com", buildRequest("INV-SA"), null))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("SUPER_ADMIN");
    }

    // ── submitInvoice ─────────────────────────────────────────────────────────

    @Test
    void submitInvoice_notOwner_throwsAccessDeniedException() {
        User other = User.builder().id(UUID.randomUUID()).email("other@test.com")
                .role(Role.VENDOR).tenantId(tenantId).build();
        Invoice invoice = buildInvoice(InvoiceStatus.DRAFT, vendor);

        when(userRepository.findByEmail("other@test.com")).thenReturn(Optional.of(other));
        when(invoiceRepository.findById(invoice.getId())).thenReturn(Optional.of(invoice));

        assertThatThrownBy(() ->
                invoiceService.submitInvoice("other@test.com", invoice.getId()))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Not your invoice");
    }

    @Test
    void submitInvoice_noActiveWorkflow_throwsBusinessException() {
        Invoice invoice = buildInvoice(InvoiceStatus.DRAFT, vendor);

        when(userRepository.findByEmail("vendor@test.com")).thenReturn(Optional.of(vendor));
        when(invoiceRepository.findById(invoice.getId())).thenReturn(Optional.of(invoice));
        when(workflowService.findActiveWorkflow(tenantId)).thenReturn(Optional.empty());

        assertThatThrownBy(() ->
                invoiceService.submitInvoice("vendor@test.com", invoice.getId()))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("No active approval workflow");
    }

    // ── processApproval ───────────────────────────────────────────────────────

    @Test
    void processApproval_wrongApproverRole_throwsBusinessException() {
        User ops = User.builder().id(UUID.randomUUID()).email("ops@test.com")
                .role(Role.OPERATIONS).build();
        ApprovalWorkflow workflow = ApprovalWorkflow.builder().id(UUID.randomUUID()).build();
        WorkflowLevel level = WorkflowLevel.builder()
                .approverRole(Role.DEPT_HEAD).levelName("L1").levelOrder(1).build();
        Invoice invoice = buildInvoice(InvoiceStatus.PENDING_APPROVAL, vendor);
        invoice.setWorkflowId(workflow.getId());
        invoice.setCurrentApprovalStep(1);

        when(userRepository.findByEmail("ops@test.com")).thenReturn(Optional.of(ops));
        when(invoiceRepository.findById(invoice.getId())).thenReturn(Optional.of(invoice));
        when(workflowService.getLevel(workflow.getId(), 1)).thenReturn(Optional.of(level));

        ApprovalRequest req = new ApprovalRequest();
        req.setAction("APPROVE");

        assertThatThrownBy(() ->
                invoiceService.processApproval("ops@test.com", invoice.getId(), req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Required role");
    }

    @Test
    void processApproval_invoiceNotPending_throwsBusinessException() {
        User approver = User.builder().id(UUID.randomUUID()).email("approver@test.com")
                .role(Role.DEPT_HEAD).build();
        Invoice invoice = buildInvoice(InvoiceStatus.APPROVED, vendor);
        invoice.setWorkflowId(UUID.randomUUID());
        invoice.setCurrentApprovalStep(1);

        when(userRepository.findByEmail("approver@test.com")).thenReturn(Optional.of(approver));
        when(invoiceRepository.findById(invoice.getId())).thenReturn(Optional.of(invoice));

        ApprovalRequest req = new ApprovalRequest();
        req.setAction("APPROVE");

        assertThatThrownBy(() ->
                invoiceService.processApproval("approver@test.com", invoice.getId(), req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("not pending approval");
    }

    // ── downloadFile ──────────────────────────────────────────────────────────

    @Test
    void downloadFile_noFileAttached_throwsResourceNotFoundException() {
        Invoice invoice = buildInvoice(InvoiceStatus.APPROVED, vendor);
        invoice.setFilePath(null);

        when(userRepository.findByEmail("vendor@test.com")).thenReturn(Optional.of(vendor));
        when(invoiceRepository.findById(invoice.getId())).thenReturn(Optional.of(invoice));

        assertThatThrownBy(() ->
                invoiceService.downloadFile("vendor@test.com", invoice.getId()))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void downloadFile_differentVendor_throwsBusinessException() {
        User other = User.builder().id(UUID.randomUUID()).email("other@test.com")
                .role(Role.VENDOR).build();
        Invoice invoice = buildInvoice(InvoiceStatus.APPROVED, vendor);
        invoice.setFilePath("/uploads/some-file.pdf");

        when(userRepository.findByEmail("other@test.com")).thenReturn(Optional.of(other));
        when(invoiceRepository.findById(invoice.getId())).thenReturn(Optional.of(invoice));

        assertThatThrownBy(() ->
                invoiceService.downloadFile("other@test.com", invoice.getId()))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Access denied");
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private CreateInvoiceRequest buildRequest(String invoiceNumber) {
        CreateInvoiceRequest req = new CreateInvoiceRequest();
        req.setInvoiceNumber(invoiceNumber);
        req.setInvoiceDate(LocalDate.of(2026, 1, 15));
        req.setAmount(BigDecimal.valueOf(5000));
        req.setClientName("Acme Corp");
        return req;
    }

    private Invoice buildInvoice(InvoiceStatus status, User vendor) {
        return Invoice.builder()
                .id(UUID.randomUUID())
                .invoiceNumber("INV-TEST")
                .vendor(vendor)
                .invoiceDate(LocalDate.of(2026, 1, 15))
                .amount(BigDecimal.valueOf(5000))
                .status(status)
                .tenantId(tenantId)
                .build();
    }
}

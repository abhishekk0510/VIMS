package com.vims.entity;

import com.vims.enums.InvoiceStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "invoices")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Invoice {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true, length = 50)
    private String invoiceNumber;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vendor_id", nullable = false)
    private User vendor;

    @Column(nullable = false)
    private LocalDate invoiceDate;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal amount;

    @Column(length = 100)
    private String clientName;

    @Column(length = 500)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private InvoiceStatus status = InvoiceStatus.DRAFT;

    @Column(length = 255)
    private String filePath;

    @Column(length = 100)
    private String fileName;

    @Column(length = 50)
    private String fileType;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(length = 500)
    private String rejectionRemarks;

    // Workflow tracking
    @Column(name = "workflow_id")
    private UUID workflowId;

    @Column(name = "current_approval_step")
    private Integer currentApprovalStep;

    // OCR extracted text
    @Column(columnDefinition = "TEXT")
    private String ocrText;

    // AI analysis fields
    @Column(columnDefinition = "TEXT")
    private String aiAnalysis;

    @Column
    private Boolean aiAnomalyFlag;

    @Column(precision = 5, scale = 2)
    private BigDecimal aiRiskScore;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}

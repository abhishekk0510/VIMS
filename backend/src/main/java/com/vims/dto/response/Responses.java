package com.vims.dto.response;

import com.vims.enums.InvoiceStatus;
import com.vims.enums.Role;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public class Responses {

    @Data @Builder
    public static class ApiResponse<T> {
        private boolean success;
        private String message;
        private T data;

        public static <T> ApiResponse<T> ok(T data) {
            return ApiResponse.<T>builder().success(true).data(data).build();
        }
        public static <T> ApiResponse<T> ok(String message, T data) {
            return ApiResponse.<T>builder().success(true).message(message).data(data).build();
        }
        public static <T> ApiResponse<T> error(String message) {
            return ApiResponse.<T>builder().success(false).message(message).build();
        }
    }

    @Data @Builder
    public static class AuthResponse {
        private String accessToken;
        private String refreshToken;
        private String tokenType;
        private UserDto user;
    }

    @Data @Builder
    public static class UserDto {
        private UUID id;
        private String name;
        private String email;
        private Role role;
        private boolean enabled;
        private UUID tenantId;
        private String tenantName;
    }

    @Data @Builder
    public static class TenantDto {
        private UUID id;
        private String name;
        private String code;
        private String description;
        private boolean active;
        private LocalDateTime createdAt;
    }

    @Data @Builder
    public static class WorkflowLevelDto {
        private UUID id;
        private Integer levelOrder;
        private String levelName;
        private Role approverRole;
        private BigDecimal minAmount;
        private BigDecimal maxAmount;
    }

    @Data @Builder
    public static class WorkflowDto {
        private UUID id;
        private String name;
        private String description;
        private boolean isActive;
        private List<WorkflowLevelDto> levels;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
    }

    @Data @Builder
    public static class InvoiceDto {
        private UUID id;
        private String invoiceNumber;
        private UserDto vendor;
        private LocalDate invoiceDate;
        private BigDecimal amount;
        private String clientName;
        private String description;
        private InvoiceStatus status;
        private String fileName;
        private String rejectionRemarks;
        // Workflow info
        private Integer currentApprovalStep;
        private Integer totalApprovalSteps;
        private String currentStepName;
        private Role currentStepRole;
        private String workflowName;
        // All levels of the assigned workflow (populated on detail view for dynamic tracker)
        private List<WorkflowLevelDto> workflowLevels;
        // OCR + AI fields
        private String ocrText;
        private String aiAnalysis;
        private Boolean aiAnomalyFlag;
        private BigDecimal aiRiskScore;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
        private List<ApprovalHistoryDto> history;
    }

    @Data @Builder
    public static class ApprovalHistoryDto {
        private UUID id;
        private UserDto actionBy;
        private Role role;
        private String statusAfter;
        private String remarks;
        private LocalDateTime createdAt;
    }

    @Data @Builder
    public static class DashboardDto {
        private long totalInvoices;
        private long draft;
        private long pendingApproval;
        private long approved;
        private long rejected;
        private long paid;
        private BigDecimal totalApprovedAmount;
        private BigDecimal totalPaidAmount;
    }

    @Data @Builder
    public static class PagedResponse<T> {
        private List<T> content;
        private int page;
        private int size;
        private long totalElements;
        private int totalPages;
        private boolean last;
    }

    @Data @Builder
    public static class ExpenseSummaryDto {
        private BigDecimal unapprovedSpendTotal;
        private List<StatusGroupDto> byStatus;
    }

    @Data @Builder
    public static class StatusGroupDto {
        private String status;
        private long count;
        private BigDecimal total;
        private List<InvoiceDto> invoices;
    }
}

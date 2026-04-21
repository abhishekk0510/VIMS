package com.vims.dto.request;

import com.vims.enums.Role;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public class InvoiceRequests {

    @Data
    public static class CreateInvoiceRequest {
        @NotBlank @Size(max=50)
        private String invoiceNumber;

        @NotNull
        private LocalDate invoiceDate;

        @NotNull @DecimalMin("0.01") @DecimalMax("99999999.99")
        private BigDecimal amount;

        @Size(max=100)
        private String clientName;

        @Size(max=500)
        private String description;
    }

    @Data
    public static class ApprovalRequest {
        @NotBlank
        private String action; // APPROVE or REJECT

        @Size(max=500)
        private String remarks;
    }

    @Data
    public static class PaymentRequest {
        @Size(max=500)
        private String remarks;
    }

    @Data
    public static class WorkflowLevelRequest {
        @NotBlank @Size(max=100)
        private String levelName;

        @NotNull
        private Role approverRole;

        private BigDecimal minAmount;
        private BigDecimal maxAmount;
    }

    @Data
    public static class CreateWorkflowRequest {
        @NotBlank @Size(max=100)
        private String name;

        @Size(max=500)
        private String description;

        @NotNull @Size(min=1)
        @Valid
        private List<WorkflowLevelRequest> levels;
    }

    @Data
    public static class UpdateWorkflowRequest {
        @NotBlank @Size(max=100)
        private String name;

        @Size(max=500)
        private String description;

        @NotNull @Size(min=1)
        @Valid
        private List<WorkflowLevelRequest> levels;
    }
}

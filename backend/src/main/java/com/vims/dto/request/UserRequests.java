package com.vims.dto.request;

import com.vims.enums.Role;
import jakarta.validation.constraints.*;
import lombok.Data;

import java.util.UUID;

public class UserRequests {

    @Data
    public static class CreateUserRequest {
        @NotBlank @Size(min=2, max=100)
        private String name;

        @NotBlank @Email
        private String email;

        @NotBlank @Size(min=8, max=64)
        @Pattern(regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$",
                 message = "Password must have uppercase, lowercase, digit and special char")
        private String password;

        @NotNull
        private Role role;

        @Pattern(regexp = "^\\+?[1-9]\\d{6,14}$", message = "Phone must be 7–15 digits, optionally starting with +")
        @Size(max = 16)
        private String phone;

        // Used by SUPER_ADMIN when creating users for a specific tenant
        private UUID tenantId;

        // Vendor-specific fields (required when role = VENDOR)
        private String vendorCode;
        private String contactPerson;
        private String address;
        private String bankName;
        private String accountNumber;
        private String ifscCode;
        private String gstin;
        private String pan;
        private String vendorType;
        private Boolean msmeRegistered;
        private String accountName;
    }

    @Data
    public static class UpdateUserRequest {
        @Size(min=2, max=100)
        private String name;
        @Pattern(regexp = "^\\+?[1-9]\\d{6,14}$", message = "Phone must be 7–15 digits, optionally starting with +")
        @Size(max = 16)
        private String phone;
        private Boolean enabled;
    }

    @Data
    public static class CreateTenantRequest {
        @NotBlank @Size(min=2, max=100)
        private String tenantName;

        @NotBlank @Size(min=2, max=30)
        private String tenantCode;

        @Size(max=500)
        private String description;

        @NotBlank @Size(min=2, max=100)
        private String adminName;

        @NotBlank @Email
        private String adminEmail;

        @NotBlank @Size(min=8, max=64)
        @Pattern(regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$",
                 message = "Password must have uppercase, lowercase, digit and special char")
        private String adminPassword;
    }
}

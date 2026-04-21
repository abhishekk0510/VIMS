package com.vims.dto.request;

import jakarta.validation.constraints.*;
import lombok.Data;

public class AuthRequests {

    @Data
    public static class LoginRequest {
        @NotBlank @Email
        private String email;
        @NotBlank @Size(min = 8, max = 64)
        private String password;
    }

    @Data
    public static class RefreshRequest {
        @NotBlank
        private String refreshToken;
    }

    @Data
    public static class ChangePasswordRequest {
        @NotBlank
        private String currentPassword;
        @NotBlank @Size(min = 8, max = 64)
        @Pattern(regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$",
                 message = "Password must have uppercase, lowercase, digit and special char")
        private String newPassword;
    }
}

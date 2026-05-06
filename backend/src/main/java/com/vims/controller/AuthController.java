package com.vims.controller;

import com.vims.dto.request.AuthRequests.*;
import com.vims.dto.response.Responses.*;
import com.vims.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(@Valid @RequestBody LoginRequest req) {
        return ResponseEntity.ok(ApiResponse.ok(authService.login(req)));
    }

    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<AuthResponse>> refresh(@Valid @RequestBody RefreshRequest req) {
        return ResponseEntity.ok(ApiResponse.ok(authService.refresh(req)));
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(@AuthenticationPrincipal UserDetails user) {
        authService.logout(user.getUsername());
        return ResponseEntity.ok(ApiResponse.ok("Logged out successfully", null));
    }

    @PostMapping("/change-password")
    public ResponseEntity<ApiResponse<Void>> changePassword(
            @AuthenticationPrincipal UserDetails user,
            @Valid @RequestBody ChangePasswordRequest req) {
        authService.changePassword(user.getUsername(), req);
        return ResponseEntity.ok(ApiResponse.ok("Password changed", null));
    }

    @PostMapping("/switch-tenant/{tenantId}")
    public ResponseEntity<ApiResponse<AuthResponse>> switchTenant(
            @AuthenticationPrincipal UserDetails user,
            @PathVariable UUID tenantId) {
        return ResponseEntity.ok(ApiResponse.ok(authService.switchTenant(user.getUsername(), tenantId)));
    }
}

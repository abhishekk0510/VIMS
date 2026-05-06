package com.vims.controller;

import com.vims.dto.request.UserRequests.*;
import com.vims.dto.response.Responses.*;
import com.vims.enums.Role;
import com.vims.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/admin")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
public class AdminController {

    private final UserService userService;

    @PostMapping("/users")
    public ResponseEntity<ApiResponse<UserDto>> createUser(@Valid @RequestBody CreateUserRequest req) {
        return ResponseEntity.ok(ApiResponse.ok("User created", userService.createUser(req)));
    }

    @GetMapping("/users")
    public ResponseEntity<ApiResponse<List<UserDto>>> getAllUsers() {
        return ResponseEntity.ok(ApiResponse.ok(userService.getAllUsers()));
    }

    @GetMapping("/users/role/{role}")
    public ResponseEntity<ApiResponse<List<UserDto>>> getUsersByRole(@PathVariable Role role) {
        return ResponseEntity.ok(ApiResponse.ok(userService.getUsersByRole(role)));
    }

    @PutMapping("/users/{id}")
    public ResponseEntity<ApiResponse<UserDto>> updateUser(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateUserRequest req) {
        return ResponseEntity.ok(ApiResponse.ok(userService.updateUser(id, req)));
    }

    @PostMapping("/users/{id}/unlock")
    public ResponseEntity<ApiResponse<Void>> unlockUser(@PathVariable UUID id) {
        userService.unlockUser(id);
        return ResponseEntity.ok(ApiResponse.ok("User unlocked", null));
    }

    // ── Multi-tenant access ────────────────────────────────────────────

    @PutMapping("/users/{id}/tenants")
    public ResponseEntity<ApiResponse<Void>> assignTenants(
            @PathVariable UUID id,
            @RequestBody AssignTenantsRequest req) {
        userService.assignTenants(id, req.getTenantIds());
        return ResponseEntity.ok(ApiResponse.ok("Tenant access updated", null));
    }

    // ── Module permissions ─────────────────────────────────────────────

    @GetMapping("/users/{id}/permissions")
    public ResponseEntity<ApiResponse<List<ModulePermissionDetail>>> getModulePermissions(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(userService.getModulePermissions(id)));
    }

    @PutMapping("/users/{id}/permissions")
    public ResponseEntity<ApiResponse<Void>> updateModulePermissions(
            @PathVariable UUID id,
            @RequestBody UpdateModulePermissionsRequest req) {
        userService.updateModulePermissions(id, req.getPermissions());
        return ResponseEntity.ok(ApiResponse.ok("Permissions updated", null));
    }

    @DeleteMapping("/users/{id}/permissions/{moduleKey}")
    public ResponseEntity<ApiResponse<Void>> resetModulePermission(
            @PathVariable UUID id,
            @PathVariable String moduleKey) {
        userService.resetModulePermission(id, moduleKey);
        return ResponseEntity.ok(ApiResponse.ok("Permission reset to default", null));
    }

    @DeleteMapping("/users/{id}/permissions")
    public ResponseEntity<ApiResponse<Void>> resetAllModulePermissions(@PathVariable UUID id) {
        userService.resetAllModulePermissions(id);
        return ResponseEntity.ok(ApiResponse.ok("All permissions reset to role defaults", null));
    }
}

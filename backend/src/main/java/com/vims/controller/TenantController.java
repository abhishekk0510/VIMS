package com.vims.controller;

import com.vims.dto.request.UserRequests.CreateTenantRequest;
import com.vims.dto.response.Responses.ApiResponse;
import com.vims.dto.response.Responses.TenantDto;
import com.vims.service.TenantService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/tenants")
@RequiredArgsConstructor
@PreAuthorize("hasRole('SUPER_ADMIN')")
public class TenantController {

    private final TenantService tenantService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<TenantDto>>> getAllTenants() {
        return ResponseEntity.ok(ApiResponse.ok(tenantService.getAllTenants()));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<TenantDto>> createTenant(@Valid @RequestBody CreateTenantRequest req) {
        return ResponseEntity.ok(ApiResponse.ok("Tenant created successfully", tenantService.createTenant(req)));
    }

    @PutMapping("/{id}/toggle")
    public ResponseEntity<ApiResponse<TenantDto>> toggleActive(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok("Tenant status toggled", tenantService.toggleActive(id)));
    }
}

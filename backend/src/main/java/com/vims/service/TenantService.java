package com.vims.service;

import com.vims.dto.request.UserRequests.CreateTenantRequest;
import com.vims.dto.response.Responses.TenantDto;
import com.vims.entity.Tenant;
import com.vims.entity.User;
import com.vims.enums.Role;
import com.vims.exception.BusinessException;
import com.vims.exception.ResourceNotFoundException;
import com.vims.repository.TenantRepository;
import com.vims.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TenantService {

    private final TenantRepository tenantRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public TenantDto createTenant(CreateTenantRequest req) {
        if (tenantRepository.findByCode(req.getTenantCode()).isPresent()) {
            throw new BusinessException("Tenant code already exists: " + req.getTenantCode());
        }
        if (userRepository.existsByEmail(req.getAdminEmail())) {
            throw new BusinessException("Email already registered: " + req.getAdminEmail());
        }

        Tenant tenant = Tenant.builder()
                .name(req.getTenantName())
                .code(req.getTenantCode().toLowerCase().trim())
                .description(req.getDescription())
                .active(true)
                .build();
        tenantRepository.save(tenant);

        // Create first ADMIN user for this tenant
        User admin = User.builder()
                .name(req.getAdminName())
                .email(req.getAdminEmail())
                .password(passwordEncoder.encode(req.getAdminPassword()))
                .role(Role.ADMIN)
                .tenantId(tenant.getId())
                .enabled(true)
                .build();
        userRepository.save(admin);

        return toDto(tenant);
    }

    @Transactional(readOnly = true)
    public List<TenantDto> getAllTenants() {
        return tenantRepository.findAll().stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public TenantDto getTenantById(UUID id) {
        return tenantRepository.findById(id)
                .map(this::toDto)
                .orElseThrow(() -> new ResourceNotFoundException("Tenant not found: " + id));
    }

    @Transactional
    public TenantDto toggleActive(UUID id) {
        Tenant tenant = tenantRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Tenant not found: " + id));
        tenant.setActive(!tenant.isActive());
        tenantRepository.save(tenant);
        return toDto(tenant);
    }

    private TenantDto toDto(Tenant t) {
        return TenantDto.builder()
                .id(t.getId())
                .name(t.getName())
                .code(t.getCode())
                .description(t.getDescription())
                .active(t.isActive())
                .createdAt(t.getCreatedAt())
                .build();
    }
}

package com.vims.service;

import com.vims.config.TenantContext;
import com.vims.dto.request.UserRequests.*;
import com.vims.dto.response.Responses.*;
import com.vims.entity.*;
import com.vims.enums.Role;
import com.vims.exception.*;
import com.vims.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final VendorMasterRepository vendorMasterRepository;
    private final TenantRepository tenantRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public UserDto createUser(CreateUserRequest req) {
        if (userRepository.existsByEmail(req.getEmail())) {
            throw new BusinessException("Email already registered");
        }

        UUID tenantId = TenantContext.get(); // null for SUPER_ADMIN
        // SUPER_ADMIN must supply tenantId explicitly; others inherit from context
        UUID effectiveTenantId = (tenantId == null) ? req.getTenantId() : tenantId;

        User user = User.builder()
                .name(req.getName())
                .email(req.getEmail())
                .password(passwordEncoder.encode(req.getPassword()))
                .role(req.getRole())
                .phone(req.getPhone())
                .tenantId(effectiveTenantId)
                .enabled(true)
                .build();
        userRepository.save(user);

        if (req.getRole() == Role.VENDOR) {
            if (req.getVendorCode() == null || req.getVendorCode().isBlank()) {
                throw new BusinessException("Vendor code is required for VENDOR role");
            }
            VendorMaster vm = VendorMaster.builder()
                    .user(user)
                    .vendorCode(req.getVendorCode())
                    .contactPerson(req.getContactPerson())
                    .phone(req.getPhone())
                    .address(req.getAddress())
                    .bankName(req.getBankName())
                    .accountNumber(req.getAccountNumber())
                    .ifscCode(req.getIfscCode())
                    .gstin(req.getGstin())
                    .pan(req.getPan())
                    .vendorType(req.getVendorType())
                    .msmeRegistered(Boolean.TRUE.equals(req.getMsmeRegistered()))
                    .accountName(req.getAccountName())
                    .build();
            vendorMasterRepository.save(vm);
        }

        return toDto(user);
    }

    @Transactional(readOnly = true)
    public List<UserDto> getAllUsers() {
        UUID tenantId = TenantContext.get();
        if (tenantId != null) {
            return userRepository.findByTenantId(tenantId).stream().map(this::toDto).collect(Collectors.toList());
        }
        return userRepository.findAll().stream().map(this::toDto).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<UserDto> getUsersByRole(Role role) {
        UUID tenantId = TenantContext.get();
        if (tenantId != null) {
            return userRepository.findByTenantIdAndRole(tenantId, role).stream().map(this::toDto).collect(Collectors.toList());
        }
        return userRepository.findByRole(role).stream().map(this::toDto).collect(Collectors.toList());
    }

    @Transactional
    public UserDto updateUser(UUID id, UpdateUserRequest req) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        if (req.getName() != null) user.setName(req.getName());
        if (req.getPhone() != null) user.setPhone(req.getPhone());
        if (req.getEnabled() != null) {
            user.setEnabled(req.getEnabled());
            if (req.getEnabled()) {
                user.setAccountLocked(false);
                user.setFailedLoginAttempts(0);
            }
        }
        return toDto(userRepository.save(user));
    }

    @Transactional
    public void unlockUser(UUID id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        user.setAccountLocked(false);
        user.setFailedLoginAttempts(0);
        userRepository.save(user);
    }

    private UserDto toDto(User u) {
        String tenantName = null;
        if (u.getTenantId() != null) {
            tenantName = tenantRepository.findById(u.getTenantId())
                    .map(Tenant::getName).orElse(null);
        }
        return UserDto.builder()
                .id(u.getId()).name(u.getName())
                .email(u.getEmail()).role(u.getRole()).enabled(u.isEnabled())
                .tenantId(u.getTenantId()).tenantName(tenantName)
                .build();
    }
}

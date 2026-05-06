package com.vims.service;

import com.vims.config.TenantContext;
import com.vims.dto.request.UserRequests.*;
import com.vims.dto.response.Responses.*;
import com.vims.entity.*;
import com.vims.enums.ModuleKey;
import com.vims.enums.Role;
import com.vims.exception.*;
import com.vims.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final VendorMasterRepository vendorMasterRepository;
    private final TenantRepository tenantRepository;
    private final UserModulePermissionRepository modulePermissionRepository;
    private final UserTenantAccessRepository userTenantAccessRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public UserDto createUser(CreateUserRequest req) {
        if (userRepository.existsByEmail(req.getEmail())) {
            throw new BusinessException("Email already registered");
        }

        UUID tenantId = TenantContext.get();
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

    // ── Multi-tenant access ─────────────────────────────────────────────

    @Transactional
    public void assignTenants(UUID userId, List<UUID> tenantIds) {
        userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        userTenantAccessRepository.deleteByUserId(userId);
        if (tenantIds != null) {
            tenantIds.forEach(tid -> userTenantAccessRepository.save(
                    UserTenantAccess.builder().userId(userId).tenantId(tid).build()));
        }
    }

    @Transactional(readOnly = true)
    public List<UUID> getAccessibleTenantIds(UUID userId) {
        return userTenantAccessRepository.findByUserId(userId).stream()
                .map(UserTenantAccess::getTenantId).collect(Collectors.toList());
    }

    // ── Module permissions ──────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<ModulePermissionDetail> getModulePermissions(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        Set<ModuleKey> defaults = getDefaultModules(user.getRole());
        Map<ModuleKey, Boolean> overrides = modulePermissionRepository.findByUserId(userId)
                .stream().collect(Collectors.toMap(
                        UserModulePermission::getModuleKey,
                        UserModulePermission::isEnabled));

        return Arrays.stream(ModuleKey.values()).map(key -> {
            boolean def = defaults.contains(key);
            Boolean override = overrides.get(key);
            boolean effective = override != null ? override : def;
            return ModulePermissionDetail.builder()
                    .key(key.name()).defaultEnabled(def).override(override).effective(effective)
                    .build();
        }).collect(Collectors.toList());
    }

    @Transactional
    public void updateModulePermissions(UUID userId, Map<String, Boolean> permissions) {
        userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        if (permissions == null) return;
        permissions.forEach((keyStr, enabled) -> {
            ModuleKey key;
            try { key = ModuleKey.valueOf(keyStr); } catch (IllegalArgumentException e) { return; }
            modulePermissionRepository.deleteByUserIdAndModuleKey(userId, key);
            modulePermissionRepository.save(UserModulePermission.builder()
                    .userId(userId).moduleKey(key).enabled(enabled).build());
        });
    }

    @Transactional
    public void resetModulePermission(UUID userId, String moduleKeyStr) {
        ModuleKey key = ModuleKey.valueOf(moduleKeyStr);
        modulePermissionRepository.deleteByUserIdAndModuleKey(userId, key);
    }

    @Transactional
    public void resetAllModulePermissions(UUID userId) {
        modulePermissionRepository.deleteByUserId(userId);
    }

    // ── DTO builder ─────────────────────────────────────────────────────

    public UserDto toDto(User u) {
        String tenantName = null;
        if (u.getTenantId() != null) {
            tenantName = tenantRepository.findById(u.getTenantId())
                    .map(Tenant::getName).orElse(null);
        }

        // Build accessible tenant list (primary + additional)
        List<UUID> accessibleIds = new ArrayList<>();
        List<String> accessibleNames = new ArrayList<>();
        if (u.getTenantId() != null) {
            accessibleIds.add(u.getTenantId());
            if (tenantName != null) accessibleNames.add(tenantName);
        }
        userTenantAccessRepository.findByUserId(u.getId()).forEach(uta -> {
            if (!accessibleIds.contains(uta.getTenantId())) {
                accessibleIds.add(uta.getTenantId());
                tenantRepository.findById(uta.getTenantId())
                        .map(Tenant::getName).ifPresent(accessibleNames::add);
            }
        });

        return UserDto.builder()
                .id(u.getId()).name(u.getName()).email(u.getEmail())
                .role(u.getRole()).enabled(u.isEnabled())
                .tenantId(u.getTenantId()).tenantName(tenantName)
                .accessibleTenantIds(accessibleIds)
                .accessibleTenantNames(accessibleNames)
                .modules(getEffectiveModules(u))
                .build();
    }

    public List<String> getEffectiveModules(User user) {
        Set<ModuleKey> defaults = getDefaultModules(user.getRole());
        Map<ModuleKey, Boolean> overrides = modulePermissionRepository.findByUserId(user.getId())
                .stream().collect(Collectors.toMap(
                        UserModulePermission::getModuleKey,
                        UserModulePermission::isEnabled));
        Set<ModuleKey> effective = new HashSet<>(defaults);
        overrides.forEach((key, enabled) -> { if (enabled) effective.add(key); else effective.remove(key); });
        return effective.stream().map(Enum::name).collect(Collectors.toList());
    }

    public static Set<ModuleKey> getDefaultModules(Role role) {
        return switch (role) {
            case SUPER_ADMIN -> new HashSet<>(Arrays.asList(ModuleKey.values()));
            case ADMIN -> new HashSet<>(Arrays.asList(
                    ModuleKey.DASHBOARD, ModuleKey.INVOICES, ModuleKey.CREATE_INVOICE,
                    ModuleKey.FINANCE_HUB, ModuleKey.AUDIT_REGISTRY, ModuleKey.REPORTS,
                    ModuleKey.USER_MANAGEMENT, ModuleKey.WORKFLOW_CONFIG));
            case CFO -> new HashSet<>(Arrays.asList(
                    ModuleKey.DASHBOARD, ModuleKey.INVOICES, ModuleKey.CFO_COMMAND,
                    ModuleKey.FINANCE_HUB, ModuleKey.AUDIT_REGISTRY, ModuleKey.REPORTS));
            case FINANCE -> new HashSet<>(Arrays.asList(
                    ModuleKey.DASHBOARD, ModuleKey.INVOICES, ModuleKey.FINANCE_HUB,
                    ModuleKey.AUDIT_REGISTRY, ModuleKey.REPORTS));
            case OPERATIONS -> new HashSet<>(Arrays.asList(
                    ModuleKey.DASHBOARD, ModuleKey.INVOICES, ModuleKey.AUDIT_REGISTRY));
            case DEPT_HEAD -> new HashSet<>(Arrays.asList(
                    ModuleKey.DASHBOARD, ModuleKey.INVOICES, ModuleKey.AUDIT_REGISTRY));
            case VENDOR -> new HashSet<>(Arrays.asList(
                    ModuleKey.DASHBOARD, ModuleKey.INVOICES, ModuleKey.CREATE_INVOICE));
            case CLIENT -> new HashSet<>(Arrays.asList(
                    ModuleKey.DASHBOARD, ModuleKey.INVOICES));
        };
    }
}

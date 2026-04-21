package com.vims.service;

import com.vims.dto.request.AuthRequests.*;
import com.vims.dto.response.Responses.*;
import com.vims.entity.*;
import com.vims.exception.BusinessException;
import com.vims.repository.*;
import com.vims.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.*;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final TenantRepository tenantRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final JwtUtil jwtUtil;
    private final UserDetailsService userDetailsService;
    private final PasswordEncoder passwordEncoder;

    @Value("${jwt.refresh.expiration.ms}")
    private long refreshExpirationMs;

    private static final int MAX_FAILED = 5;

    @Transactional
    public AuthResponse login(LoginRequest req) {
        User user = userRepository.findByEmail(req.getEmail())
                .orElseThrow(() -> new BadCredentialsException("Invalid credentials"));

        if (user.isAccountLocked()) {
            throw new LockedException("Account is locked");
        }

        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(req.getEmail(), req.getPassword()));
        } catch (BadCredentialsException e) {
            handleFailedLogin(user);
            throw e;
        }

        // Reset failed attempts on success
        user.setFailedLoginAttempts(0);
        user.setAccountLocked(false);
        userRepository.save(user);

        UserDetails userDetails = userDetailsService.loadUserByUsername(req.getEmail());
        Map<String, Object> claims = new HashMap<>();
        claims.put("role", user.getRole().name());
        claims.put("userId", user.getId().toString());
        claims.put("tenantId", user.getTenantId() != null ? user.getTenantId().toString() : "");
        String accessToken = jwtUtil.generateToken(userDetails, claims);
        String refreshToken = createRefreshToken(user);

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .tokenType("Bearer")
                .user(toUserDto(user))
                .build();
    }

    @Transactional
    public AuthResponse refresh(RefreshRequest req) {
        RefreshToken token = refreshTokenRepository.findByTokenAndRevokedFalse(req.getRefreshToken())
                .orElseThrow(() -> new BusinessException("Invalid or expired refresh token"));

        if (token.getExpiryDate().isBefore(Instant.now())) {
            token.setRevoked(true);
            refreshTokenRepository.save(token);
            throw new BusinessException("Refresh token expired. Please login again.");
        }

        User user = token.getUser();
        UserDetails userDetails = userDetailsService.loadUserByUsername(user.getEmail());
        Map<String, Object> claims = new HashMap<>();
        claims.put("role", user.getRole().name());
        claims.put("userId", user.getId().toString());
        claims.put("tenantId", user.getTenantId() != null ? user.getTenantId().toString() : "");
        String newAccess = jwtUtil.generateToken(userDetails, claims);

        return AuthResponse.builder()
                .accessToken(newAccess)
                .refreshToken(req.getRefreshToken())
                .tokenType("Bearer")
                .user(toUserDto(user))
                .build();
    }

    @Transactional
    public void logout(String email) {
        userRepository.findByEmail(email).ifPresent(user -> {
            refreshTokenRepository.revokeAllUserTokens(user);
        });
    }

    @Transactional
    public void changePassword(String email, ChangePasswordRequest req) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new BusinessException("User not found"));

        if (!passwordEncoder.matches(req.getCurrentPassword(), user.getPassword())) {
            throw new BusinessException("Current password is incorrect");
        }

        user.setPassword(passwordEncoder.encode(req.getNewPassword()));
        userRepository.save(user);
        refreshTokenRepository.revokeAllUserTokens(user);
    }

    private void handleFailedLogin(User user) {
        user.setFailedLoginAttempts(user.getFailedLoginAttempts() + 1);
        if (user.getFailedLoginAttempts() >= MAX_FAILED) {
            user.setAccountLocked(true);
            log.warn("Account locked for user: {}", user.getEmail());
        }
        userRepository.save(user);
    }

    private String createRefreshToken(User user) {
        refreshTokenRepository.revokeAllUserTokens(user);
        String tokenValue = UUID.randomUUID().toString();
        RefreshToken rt = RefreshToken.builder()
                .user(user)
                .token(tokenValue)
                .expiryDate(Instant.now().plusMillis(refreshExpirationMs))
                .build();
        refreshTokenRepository.save(rt);
        return tokenValue;
    }

    private UserDto toUserDto(User u) {
        String tenantName = null;
        if (u.getTenantId() != null) {
            tenantName = tenantRepository.findById(u.getTenantId())
                    .map(Tenant::getName).orElse(null);
        }
        return UserDto.builder()
                .id(u.getId()).name(u.getName())
                .email(u.getEmail()).role(u.getRole())
                .enabled(u.isEnabled())
                .tenantId(u.getTenantId())
                .tenantName(tenantName)
                .build();
    }
}

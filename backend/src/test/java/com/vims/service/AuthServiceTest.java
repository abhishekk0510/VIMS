package com.vims.service;

import com.vims.dto.request.AuthRequests.ChangePasswordRequest;
import com.vims.dto.request.AuthRequests.LoginRequest;
import com.vims.dto.response.Responses.AuthResponse;
import com.vims.entity.RefreshToken;
import com.vims.entity.User;
import com.vims.enums.Role;
import com.vims.exception.BusinessException;
import com.vims.repository.*;
import com.vims.security.JwtUtil;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.*;
import org.springframework.security.core.userdetails.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.*;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock UserRepository userRepository;
    @Mock TenantRepository tenantRepository;
    @Mock RefreshTokenRepository refreshTokenRepository;
    @Mock JwtUtil jwtUtil;
    @Mock UserDetailsService userDetailsService;
    @Mock PasswordEncoder passwordEncoder;
    @Mock AuthenticationManager authenticationManager;

    @InjectMocks
    AuthService authService;

    private static final long REFRESH_EXP_MS = 604_800_000L;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(authService, "refreshExpirationMs", REFRESH_EXP_MS);
    }

    // ── login ─────────────────────────────────────────────────────────────────

    @Test
    void login_validCredentials_returnsAuthResponse() {
        User user = activeUser("vendor@test.com");
        UserDetails ud = new org.springframework.security.core.userdetails.User(
                user.getEmail(), user.getPassword(), List.of());
        RefreshToken rt = RefreshToken.builder()
                .token("refresh-tok")
                .user(user)
                .expiryDate(Instant.now().plusMillis(REFRESH_EXP_MS))
                .build();

        when(userRepository.findByEmail("vendor@test.com")).thenReturn(Optional.of(user));
        when(userDetailsService.loadUserByUsername("vendor@test.com")).thenReturn(ud);
        when(jwtUtil.generateToken(any(UserDetails.class), any())).thenReturn("access-token");
        when(userRepository.save(any())).thenReturn(user);
        when(refreshTokenRepository.save(any())).thenReturn(rt);

        LoginRequest req = loginReq("vendor@test.com", "ValidPass1!");
        AuthResponse response = authService.login(req);

        assertThat(response.getAccessToken()).isEqualTo("access-token");
        assertThat(response.getTokenType()).isEqualTo("Bearer");
        assertThat(response.getRefreshToken()).isNotBlank(); // UUID generated internally
        verify(userRepository).save(user); // reset failed attempts
    }

    @Test
    void login_userNotFound_throwsBadCredentialsException() {
        when(userRepository.findByEmail("nobody@test.com")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.login(loginReq("nobody@test.com", "Pass1!")))
                .isInstanceOf(BadCredentialsException.class);
    }

    @Test
    void login_accountPermanentlyLocked_throwsLockedException() {
        User user = activeUser("locked@test.com");
        user.setAccountLocked(true);
        user.setLockTime(LocalDateTime.now().minusMinutes(5)); // locked 5 min ago, not yet expired

        when(userRepository.findByEmail("locked@test.com")).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> authService.login(loginReq("locked@test.com", "Pass1!")))
                .isInstanceOf(LockedException.class);
    }

    @Test
    void login_expiredLock_autoUnlocksAndProceeds() {
        User user = activeUser("autolock@test.com");
        user.setAccountLocked(true);
        user.setLockTime(LocalDateTime.now().minusMinutes(35)); // > 30 min → auto-unlock

        UserDetails ud = new org.springframework.security.core.userdetails.User(
                user.getEmail(), user.getPassword(), List.of());
        RefreshToken rt = RefreshToken.builder()
                .token("rt-tok").user(user)
                .expiryDate(Instant.now().plusMillis(REFRESH_EXP_MS)).build();

        when(userRepository.findByEmail("autolock@test.com")).thenReturn(Optional.of(user));
        when(userDetailsService.loadUserByUsername("autolock@test.com")).thenReturn(ud);
        when(jwtUtil.generateToken(any(UserDetails.class), any())).thenReturn("tok");
        when(userRepository.save(any())).thenReturn(user);
        when(refreshTokenRepository.save(any())).thenReturn(rt);

        AuthResponse response = authService.login(loginReq("autolock@test.com", "Pass1!"));

        assertThat(response).isNotNull();
        assertThat(user.isAccountLocked()).isFalse();
        assertThat(user.getFailedLoginAttempts()).isZero();
    }

    @Test
    void login_wrongPassword_incrementsFailedAttempts() {
        User user = activeUser("vendor@test.com");
        user.setFailedLoginAttempts(2);

        when(userRepository.findByEmail("vendor@test.com")).thenReturn(Optional.of(user));
        when(authenticationManager.authenticate(any()))
                .thenThrow(new BadCredentialsException("bad creds"));
        when(userRepository.save(any())).thenReturn(user);

        assertThatThrownBy(() -> authService.login(loginReq("vendor@test.com", "WrongPass1!")))
                .isInstanceOf(BadCredentialsException.class);

        assertThat(user.getFailedLoginAttempts()).isEqualTo(3);
        assertThat(user.isAccountLocked()).isFalse();
    }

    @Test
    void login_maxFailedAttempts_locksAccount() {
        User user = activeUser("vendor@test.com");
        user.setFailedLoginAttempts(4); // 5th failure triggers lock

        when(userRepository.findByEmail("vendor@test.com")).thenReturn(Optional.of(user));
        when(authenticationManager.authenticate(any()))
                .thenThrow(new BadCredentialsException("bad creds"));
        when(userRepository.save(any())).thenReturn(user);

        assertThatThrownBy(() -> authService.login(loginReq("vendor@test.com", "WrongPass1!")))
                .isInstanceOf(BadCredentialsException.class);

        assertThat(user.isAccountLocked()).isTrue();
        assertThat(user.getLockTime()).isNotNull();
    }

    // ── changePassword ────────────────────────────────────────────────────────

    @Test
    void changePassword_wrongCurrentPassword_throwsBusinessException() {
        User user = activeUser("vendor@test.com");
        user.setPassword("$2a$12$encoded-password");

        when(userRepository.findByEmail("vendor@test.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("WrongOld@1", "$2a$12$encoded-password")).thenReturn(false);

        ChangePasswordRequest req = new ChangePasswordRequest();
        req.setCurrentPassword("WrongOld@1");
        req.setNewPassword("NewPass@123");

        assertThatThrownBy(() -> authService.changePassword("vendor@test.com", req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Current password is incorrect");
    }

    @Test
    void changePassword_success_encodesNewPasswordAndRevokesTokens() {
        User user = activeUser("vendor@test.com");
        user.setPassword("$2a$12$old");

        when(userRepository.findByEmail("vendor@test.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("OldPass@1", "$2a$12$old")).thenReturn(true);
        when(passwordEncoder.encode("NewPass@123")).thenReturn("$2a$12$new");
        when(userRepository.save(any())).thenReturn(user);

        ChangePasswordRequest req = new ChangePasswordRequest();
        req.setCurrentPassword("OldPass@1");
        req.setNewPassword("NewPass@123");

        authService.changePassword("vendor@test.com", req);

        assertThat(user.getPassword()).isEqualTo("$2a$12$new");
        verify(refreshTokenRepository).revokeAllUserTokens(user);
    }

    // ── logout ────────────────────────────────────────────────────────────────

    @Test
    void logout_revokesAllUserTokens() {
        User user = activeUser("vendor@test.com");
        when(userRepository.findByEmail("vendor@test.com")).thenReturn(Optional.of(user));

        authService.logout("vendor@test.com");

        verify(refreshTokenRepository).revokeAllUserTokens(user);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private User activeUser(String email) {
        return User.builder()
                .id(UUID.randomUUID())
                .name("Test User")
                .email(email)
                .password("$2a$12$hashed")
                .role(Role.VENDOR)
                .accountLocked(false)
                .failedLoginAttempts(0)
                .enabled(true)
                .build();
    }

    private LoginRequest loginReq(String email, String password) {
        LoginRequest req = new LoginRequest();
        req.setEmail(email);
        req.setPassword(password);
        return req;
    }
}

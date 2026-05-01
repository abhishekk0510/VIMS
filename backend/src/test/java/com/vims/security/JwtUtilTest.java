package com.vims.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.*;

class JwtUtilTest {

    private JwtUtil jwtUtil;

    @BeforeEach
    void setUp() {
        jwtUtil = new JwtUtil();
        ReflectionTestUtils.setField(jwtUtil, "secret",
                "test-jwt-secret-key-for-unit-tests-only-should-be-long-enough");
        ReflectionTestUtils.setField(jwtUtil, "expirationMs", 3_600_000L); // 1 hour
    }

    @Test
    void generateToken_returnsNonBlankToken() {
        UserDetails user = testUser("vendor@test.com");
        String token = jwtUtil.generateToken(user);
        assertThat(token).isNotBlank();
    }

    @Test
    void extractUsername_returnsSubjectFromToken() {
        UserDetails user = testUser("vendor@test.com");
        String token = jwtUtil.generateToken(user);
        assertThat(jwtUtil.extractUsername(token)).isEqualTo("vendor@test.com");
    }

    @Test
    void isTokenValid_sameUser_returnsTrue() {
        UserDetails user = testUser("vendor@test.com");
        String token = jwtUtil.generateToken(user);
        assertThat(jwtUtil.isTokenValid(token, user)).isTrue();
    }

    @Test
    void isTokenValid_differentUser_returnsFalse() {
        UserDetails user1 = testUser("vendor@test.com");
        UserDetails user2 = testUser("other@test.com");
        String token = jwtUtil.generateToken(user1);
        assertThat(jwtUtil.isTokenValid(token, user2)).isFalse();
    }

    @Test
    void isTokenValid_expiredToken_returnsFalse() {
        JwtUtil shortLived = new JwtUtil();
        ReflectionTestUtils.setField(shortLived, "secret",
                "test-jwt-secret-key-for-unit-tests-only-should-be-long-enough");
        ReflectionTestUtils.setField(shortLived, "expirationMs", -1000L); // already expired

        UserDetails user = testUser("vendor@test.com");
        String token = shortLived.generateToken(user);
        assertThat(shortLived.isTokenValid(token, user)).isFalse();
    }

    @Test
    void isTokenValid_malformedToken_returnsFalse() {
        UserDetails user = testUser("vendor@test.com");
        assertThat(jwtUtil.isTokenValid("not.a.valid.jwt", user)).isFalse();
    }

    @Test
    void generateToken_withExtraClaims_embeddedInToken() {
        UserDetails user = testUser("admin@test.com");
        Map<String, Object> claims = Map.of("role", "ADMIN", "tenantId", "abc-123");
        String token = jwtUtil.generateToken(user, claims);

        assertThat(jwtUtil.extractUsername(token)).isEqualTo("admin@test.com");
        String tenantId = jwtUtil.extractTenantId(token);
        assertThat(tenantId).isEqualTo("abc-123");
    }

    @Test
    void extractTenantId_noTenantInToken_returnsNull() {
        UserDetails user = testUser("vendor@test.com");
        String token = jwtUtil.generateToken(user);
        assertThat(jwtUtil.extractTenantId(token)).isNull();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private UserDetails testUser(String email) {
        return new User(email, "password", List.of());
    }
}

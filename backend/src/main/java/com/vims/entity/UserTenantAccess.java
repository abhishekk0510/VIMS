package com.vims.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "user_tenant_access",
       uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "tenant_id"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class UserTenantAccess {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;
}

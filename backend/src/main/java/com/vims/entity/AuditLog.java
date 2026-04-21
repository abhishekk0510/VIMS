package com.vims.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "audit_logs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 50)
    private String eventType;

    @Column(nullable = false, length = 100)
    private String actor;

    @Column(nullable = false, length = 30)
    private String actorRole;

    @Column(nullable = false, length = 500)
    private String description;

    @Column(name = "tenant_id")
    private UUID tenantId;

    @Column(length = 50)
    private String invoiceRef;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;
}

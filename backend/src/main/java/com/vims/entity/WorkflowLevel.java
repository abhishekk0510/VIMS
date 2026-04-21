package com.vims.entity;

import com.vims.enums.Role;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "workflow_levels",
       uniqueConstraints = @UniqueConstraint(columnNames = {"workflow_id", "level_order"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class WorkflowLevel {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "workflow_id", nullable = false)
    private ApprovalWorkflow workflow;

    @Column(name = "level_order", nullable = false)
    private Integer levelOrder;

    @Column(name = "level_name", nullable = false, length = 100)
    private String levelName;

    @Enumerated(EnumType.STRING)
    @Column(name = "approver_role", nullable = false, length = 30)
    private Role approverRole;

    @Column(name = "min_amount", precision = 15, scale = 2)
    private BigDecimal minAmount;

    @Column(name = "max_amount", precision = 15, scale = 2)
    private BigDecimal maxAmount;
}

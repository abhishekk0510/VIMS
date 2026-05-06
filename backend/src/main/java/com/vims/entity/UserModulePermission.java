package com.vims.entity;

import com.vims.enums.ModuleKey;
import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "user_module_permissions",
       uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "module_key"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class UserModulePermission {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Enumerated(EnumType.STRING)
    @Column(name = "module_key", nullable = false, length = 30)
    private ModuleKey moduleKey;

    @Column(nullable = false)
    private boolean enabled;
}

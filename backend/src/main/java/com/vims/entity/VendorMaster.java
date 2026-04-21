package com.vims.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "vendor_master")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class VendorMaster {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(nullable = false, unique = true, length = 30)
    private String vendorCode;

    @Column(length = 100)
    private String contactPerson;

    @Column(length = 15)
    private String phone;

    @Column(length = 200)
    private String address;

    @Column(length = 50)
    private String bankName;

    @Column(length = 30)
    private String accountNumber;

    @Column(length = 20)
    private String ifscCode;

    @Column(length = 15)
    private String gstin;

    @Column(length = 10)
    private String pan;

    @Column(length = 30)
    private String vendorType;

    @Column(nullable = false)
    @Builder.Default
    private boolean msmeRegistered = false;

    @Column(length = 100)
    private String accountName;

    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;
}

package com.vims.repository;

import com.vims.entity.VendorMaster;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface VendorMasterRepository extends JpaRepository<VendorMaster, UUID> {
    boolean existsByVendorCode(String vendorCode);
    Optional<VendorMaster> findByUserId(UUID userId);
}

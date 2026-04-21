package com.vims.repository;

import com.vims.entity.Invoice;
import com.vims.entity.User;
import com.vims.enums.InvoiceStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface InvoiceRepository extends JpaRepository<Invoice, UUID> {

    Optional<Invoice> findByInvoiceNumber(String invoiceNumber);
    boolean existsByInvoiceNumber(String invoiceNumber);

    Page<Invoice> findByVendor(User vendor, Pageable pageable);
    Page<Invoice> findByStatus(InvoiceStatus status, Pageable pageable);
    Page<Invoice> findByVendorAndStatus(User vendor, InvoiceStatus status, Pageable pageable);

    @Query("SELECT i FROM Invoice i WHERE " +
           "(:tenantId IS NULL OR i.tenantId = :tenantId) AND " +
           "(:vendorId IS NULL OR i.vendor.id = :vendorId) AND " +
           "(:status IS NULL OR i.status = :status) AND " +
           "(:from IS NULL OR i.invoiceDate >= :from) AND " +
           "(:to IS NULL OR i.invoiceDate <= :to) AND " +
           "(:clientName IS NULL OR LOWER(i.clientName) LIKE LOWER(CONCAT('%', CAST(:clientName AS string), '%')))")
    Page<Invoice> findWithFilters(
            @Param("tenantId") UUID tenantId,
            @Param("vendorId") UUID vendorId,
            @Param("status") InvoiceStatus status,
            @Param("from") LocalDate from,
            @Param("to") LocalDate to,
            @Param("clientName") String clientName,
            Pageable pageable);

    @Query("SELECT COUNT(i) FROM Invoice i WHERE i.status = :status")
    long countByStatus(@Param("status") InvoiceStatus status);

    @Query("SELECT COUNT(i) FROM Invoice i WHERE i.tenantId = :tenantId AND i.status = :status")
    long countByTenantIdAndStatus(@Param("tenantId") UUID tenantId, @Param("status") InvoiceStatus status);

    @Query("SELECT COUNT(i) FROM Invoice i WHERE i.tenantId = :tenantId")
    long countByTenantId(@Param("tenantId") UUID tenantId);

    @Query("SELECT COUNT(i) FROM Invoice i WHERE i.vendor.id = :vendorId")
    long countByVendorId(@Param("vendorId") UUID vendorId);

    @Query("SELECT COUNT(i) FROM Invoice i WHERE i.vendor.id = :vendorId AND i.status = :status")
    long countByVendorIdAndStatus(@Param("vendorId") UUID vendorId, @Param("status") InvoiceStatus status);

    @Query("SELECT COALESCE(SUM(i.amount), 0) FROM Invoice i WHERE i.status = :status")
    BigDecimal sumAmountByStatus(@Param("status") InvoiceStatus status);

    @Query("SELECT COALESCE(SUM(i.amount), 0) FROM Invoice i WHERE i.tenantId = :tenantId AND i.status = :status")
    BigDecimal sumAmountByTenantIdAndStatus(@Param("tenantId") UUID tenantId, @Param("status") InvoiceStatus status);

    @Query("SELECT COALESCE(SUM(i.amount), 0) FROM Invoice i WHERE i.vendor.id = :vendorId AND i.status = :status")
    BigDecimal sumAmountByVendorIdAndStatus(@Param("vendorId") UUID vendorId, @Param("status") InvoiceStatus status);

    List<Invoice> findByStatusIn(List<InvoiceStatus> statuses);

    List<Invoice> findByTenantId(UUID tenantId);
}

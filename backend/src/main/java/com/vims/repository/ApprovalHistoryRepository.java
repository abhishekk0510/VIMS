package com.vims.repository;

import com.vims.entity.ApprovalHistory;
import com.vims.entity.Invoice;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ApprovalHistoryRepository extends JpaRepository<ApprovalHistory, UUID> {
    List<ApprovalHistory> findByInvoiceOrderByCreatedAtAsc(Invoice invoice);
}

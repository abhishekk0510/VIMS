package com.vims.service;

import com.vims.config.TenantContext;
import com.vims.entity.AuditLog;
import com.vims.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;

    @Async
    public void log(String eventType, String actor, String actorRole, String description, String invoiceRef) {
        try {
            UUID tenantId = TenantContext.get();
            AuditLog entry = AuditLog.builder()
                    .eventType(eventType)
                    .actor(actor)
                    .actorRole(actorRole)
                    .description(description)
                    .invoiceRef(invoiceRef)
                    .tenantId(tenantId)
                    .build();
            auditLogRepository.save(entry);
        } catch (Exception ex) {
            log.warn("Failed to write audit log entry: {}", ex.getMessage());
        }
    }

    public List<AuditLog> getLogs(String type) {
        UUID tenantId = TenantContext.get();
        if (tenantId != null) {
            if (type != null && !type.isBlank()) {
                return auditLogRepository.findByTenantIdAndEventTypeIgnoreCaseOrderByCreatedAtDesc(tenantId, type);
            }
            return auditLogRepository.findByTenantIdOrderByCreatedAtDesc(tenantId);
        }
        if (type != null && !type.isBlank()) {
            return auditLogRepository.findByEventTypeIgnoreCaseOrderByCreatedAtDesc(type);
        }
        return auditLogRepository.findAllByOrderByCreatedAtDesc();
    }

    public String exportCsv(String type) {
        List<AuditLog> logs = getLogs(type);
        StringBuilder sb = new StringBuilder();
        sb.append("id,eventType,actor,actorRole,description,invoiceRef,createdAt\n");
        for (AuditLog l : logs) {
            sb.append(csvEscape(l.getId().toString())).append(",")
              .append(csvEscape(l.getEventType())).append(",")
              .append(csvEscape(l.getActor())).append(",")
              .append(csvEscape(l.getActorRole())).append(",")
              .append(csvEscape(l.getDescription())).append(",")
              .append(csvEscape(l.getInvoiceRef())).append(",")
              .append(l.getCreatedAt()).append("\n");
        }
        return sb.toString();
    }

    private String csvEscape(String val) {
        if (val == null) return "";
        if (val.contains(",") || val.contains("\"") || val.contains("\n")) {
            return "\"" + val.replace("\"", "\"\"") + "\"";
        }
        return val;
    }
}

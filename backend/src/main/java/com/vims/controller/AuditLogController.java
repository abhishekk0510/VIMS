package com.vims.controller;

import com.vims.entity.AuditLog;
import com.vims.service.AuditLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/audit")
@RequiredArgsConstructor
public class AuditLogController {

    private final AuditLogService auditLogService;

    @GetMapping("/logs")
    @PreAuthorize("hasAnyRole('ADMIN','FINANCE','CFO','OPERATIONS','DEPT_HEAD')")
    public ResponseEntity<?> getLogs(@RequestParam(required = false) String type) {
        List<AuditLog> logs = auditLogService.getLogs(type);
        return ResponseEntity.ok(Map.of("success", true, "data", logs));
    }

    @GetMapping("/logs/export")
    @PreAuthorize("hasAnyRole('ADMIN','FINANCE','CFO','OPERATIONS','DEPT_HEAD')")
    public ResponseEntity<byte[]> exportCsv(@RequestParam(required = false) String type) {
        String csv = auditLogService.exportCsv(type);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"audit-logs.csv\"")
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(csv.getBytes());
    }
}

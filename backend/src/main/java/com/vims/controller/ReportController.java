package com.vims.controller;

import com.vims.enums.InvoiceStatus;
import com.vims.service.ReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/reports")
@RequiredArgsConstructor
public class ReportController {

    private final ReportService reportService;

    @GetMapping("/invoices/export")
    @PreAuthorize("hasAnyRole('ADMIN','FINANCE','OPERATIONS')")
    public ResponseEntity<byte[]> exportInvoices(
            @RequestParam(required = false) InvoiceStatus status) throws Exception {
        byte[] data = reportService.generateInvoiceReport(status);
        String filename = "VIMS_Invoice_Report_" + java.time.LocalDate.now() + ".xlsx";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(data);
    }

    @GetMapping("/pendency/export")
    @PreAuthorize("hasAnyRole('ADMIN','FINANCE','OPERATIONS')")
    public ResponseEntity<byte[]> exportPendency() throws Exception {
        byte[] data = reportService.generatePendencyReport();
        String filename = "VIMS_Pendency_Report_" + java.time.LocalDate.now() + ".xlsx";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(data);
    }
}

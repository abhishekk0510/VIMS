package com.vims.controller;

import com.vims.dto.request.InvoiceRequests.*;
import com.vims.dto.response.Responses.*;
import com.vims.enums.InvoiceStatus;
import com.vims.service.InvoiceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.UUID;

@RestController
@RequestMapping("/invoices")
@RequiredArgsConstructor
public class InvoiceController {

    private final InvoiceService invoiceService;

    @PostMapping
    public ResponseEntity<ApiResponse<InvoiceDto>> create(
            @AuthenticationPrincipal UserDetails user,
            @Valid @RequestPart("invoice") CreateInvoiceRequest req,
            @RequestPart(value = "file", required = false) MultipartFile file) {
        return ResponseEntity.ok(ApiResponse.ok(invoiceService.createInvoice(user.getUsername(), req, file)));
    }

    @PostMapping("/{id}/submit")
    public ResponseEntity<ApiResponse<InvoiceDto>> submit(
            @AuthenticationPrincipal UserDetails user,
            @PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(invoiceService.submitInvoice(user.getUsername(), id)));
    }

    @PostMapping("/{id}/approval")
    public ResponseEntity<ApiResponse<InvoiceDto>> processApproval(
            @AuthenticationPrincipal UserDetails user,
            @PathVariable UUID id,
            @Valid @RequestBody ApprovalRequest req) {
        return ResponseEntity.ok(ApiResponse.ok(invoiceService.processApproval(user.getUsername(), id, req)));
    }

    @PostMapping("/{id}/pay")
    public ResponseEntity<ApiResponse<InvoiceDto>> markPaid(
            @AuthenticationPrincipal UserDetails user,
            @PathVariable UUID id,
            @RequestParam(required = false) String remarks) {
        return ResponseEntity.ok(ApiResponse.ok(invoiceService.markPaid(user.getUsername(), id, remarks)));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<PagedResponse<InvoiceDto>>> list(
            @AuthenticationPrincipal UserDetails user,
            @RequestParam(required = false) InvoiceStatus status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) String clientName,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.ok(
                invoiceService.getInvoices(user.getUsername(), status, from, to, clientName, page, size)));
    }

    @GetMapping("/{id}/download")
    public ResponseEntity<Resource> download(
            @AuthenticationPrincipal UserDetails user,
            @PathVariable UUID id) {
        Resource file = invoiceService.downloadFile(user.getUsername(), id);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + file.getFilename() + "\"")
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(file);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<InvoiceDto>> getById(
            @AuthenticationPrincipal UserDetails user,
            @PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(invoiceService.getInvoiceById(user.getUsername(), id)));
    }

    @GetMapping("/dashboard")
    public ResponseEntity<ApiResponse<DashboardDto>> dashboard(
            @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(ApiResponse.ok(invoiceService.getDashboard(user.getUsername())));
    }

    @GetMapping("/expense-summary")
    public ResponseEntity<ApiResponse<ExpenseSummaryDto>> expenseSummary() {
        return ResponseEntity.ok(ApiResponse.ok(invoiceService.getExpenseSummary()));
    }
}

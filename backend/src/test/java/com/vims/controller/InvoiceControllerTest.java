package com.vims.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.vims.dto.response.Responses.*;
import com.vims.enums.InvoiceStatus;
import com.vims.enums.Role;
import com.vims.security.JwtUtil;
import com.vims.service.FileDownload;
import com.vims.service.InvoiceService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(InvoiceController.class)
class InvoiceControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;

    @MockBean InvoiceService invoiceService;
    @MockBean JwtUtil jwtUtil;
    @MockBean UserDetailsService userDetailsService;

    // ── Authentication guard ──────────────────────────────────────────────────

    @Test
    void getInvoices_unauthenticated_returnsForbidden() throws Exception {
        mockMvc.perform(get("/invoices"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void createInvoice_unauthenticated_returns4xx() throws Exception {
        MockMultipartFile invoicePart = new MockMultipartFile(
                "invoice", "", "application/json",
                "{\"invoiceNumber\":\"INV-1\",\"invoiceDate\":\"2026-01-15\",\"amount\":1000}".getBytes());

        // POST to a secured endpoint without a token → Spring Security rejects (401 or 403)
        mockMvc.perform(multipart("/invoices").file(invoicePart))
                .andExpect(status().is4xxClientError());
    }

    @Test
    void downloadFile_unauthenticated_returnsUnauthorized() throws Exception {
        mockMvc.perform(get("/invoices/{id}/download", UUID.randomUUID()))
                .andExpect(status().isUnauthorized());
    }

    // ── Authenticated happy paths ─────────────────────────────────────────────

    @Test
    @WithMockUser(username = "vendor@test.com", roles = "VENDOR")
    void getInvoices_authenticated_returns200() throws Exception {
        PagedResponse<InvoiceDto> paged = PagedResponse.<InvoiceDto>builder()
                .content(List.of())
                .page(0).size(20).totalElements(0).totalPages(0).last(true)
                .build();
        when(invoiceService.getInvoices(eq("vendor@test.com"), any(), any(), any(), any(),
                eq(0), eq(20))).thenReturn(paged);

        mockMvc.perform(get("/invoices"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @WithMockUser(username = "vendor@test.com", roles = "VENDOR")
    void createInvoice_validRequest_returns200() throws Exception {
        InvoiceDto dto = InvoiceDto.builder()
                .id(UUID.randomUUID())
                .invoiceNumber("INV-100")
                .status(InvoiceStatus.DRAFT)
                .amount(BigDecimal.valueOf(1000))
                .invoiceDate(LocalDate.of(2026, 1, 15))
                .vendor(UserDto.builder().id(UUID.randomUUID()).name("Vendor").role(Role.VENDOR).build())
                .build();
        when(invoiceService.createInvoice(eq("vendor@test.com"), any(), any())).thenReturn(dto);

        MockMultipartFile invoicePart = new MockMultipartFile(
                "invoice", "", "application/json",
                objectMapper.writeValueAsBytes(Map.of(
                        "invoiceNumber", "INV-100",
                        "invoiceDate", "2026-01-15",
                        "amount", 1000.00,
                        "clientName", "Acme Corp"
                )));

        mockMvc.perform(multipart("/invoices")
                        .file(invoicePart)
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.invoiceNumber").value("INV-100"))
                .andExpect(jsonPath("$.data.status").value("DRAFT"));
    }

    @Test
    @WithMockUser(username = "vendor@test.com", roles = "VENDOR")
    void downloadFile_authenticated_returns200WithAttachment() throws Exception {
        UUID invoiceId = UUID.randomUUID();
        FileDownload fd = new FileDownload(
                new ByteArrayResource("pdf-content".getBytes()), "invoice.pdf");
        when(invoiceService.downloadFile(eq("vendor@test.com"), eq(invoiceId))).thenReturn(fd);

        mockMvc.perform(get("/invoices/{id}/download", invoiceId))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Disposition",
                        "attachment; filename=\"invoice.pdf\""));
    }

    @Test
    @WithMockUser(username = "vendor@test.com", roles = "VENDOR")
    void getDashboard_authenticated_returns200() throws Exception {
        DashboardDto dash = DashboardDto.builder()
                .totalInvoices(0L).draft(0L).pendingApproval(0L)
                .approved(0L).rejected(0L).paid(0L)
                .totalApprovedAmount(BigDecimal.ZERO).totalPaidAmount(BigDecimal.ZERO)
                .build();
        when(invoiceService.getDashboard("vendor@test.com")).thenReturn(dash);

        mockMvc.perform(get("/invoices/dashboard"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalInvoices").value(0));
    }
}

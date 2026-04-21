package com.vims.service;

import com.vims.entity.Invoice;
import com.vims.enums.InvoiceStatus;
import com.vims.repository.InvoiceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.usermodel.*;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReportService {

    private final InvoiceRepository invoiceRepository;
    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("dd-MM-yyyy");

    public byte[] generateInvoiceReport(InvoiceStatus status) throws IOException {
        List<Invoice> invoices = status != null
                ? invoiceRepository.findByStatus(status, org.springframework.data.domain.Pageable.unpaged()).getContent()
                : invoiceRepository.findAll();

        XSSFWorkbook wb = new XSSFWorkbook();
        XSSFSheet sheet = wb.createSheet("VIMS Invoice Report");

        // Styles
        XSSFCellStyle headerStyle = wb.createCellStyle();
        XSSFFont headerFont = wb.createFont();
        headerFont.setBold(true);
        headerFont.setColor(IndexedColors.WHITE.getIndex());
        headerFont.setFontHeightInPoints((short) 11);
        headerStyle.setFont(headerFont);
        headerStyle.setFillForegroundColor(new XSSFColor(new byte[]{(byte)31, (byte)73, (byte)125}, null));
        headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        headerStyle.setBorderBottom(BorderStyle.THIN);

        XSSFCellStyle titleStyle = wb.createCellStyle();
        XSSFFont titleFont = wb.createFont();
        titleFont.setBold(true);
        titleFont.setFontHeightInPoints((short) 14);
        titleStyle.setFont(titleFont);

        // Title Row
        Row titleRow = sheet.createRow(0);
        Cell titleCell = titleRow.createCell(0);
        titleCell.setCellValue("VIMS – Invoice Report");
        titleCell.setCellStyle(titleStyle);
        sheet.addMergedRegion(new CellRangeAddress(0, 0, 0, 8));

        // Sub-title
        Row subRow = sheet.createRow(1);
        subRow.createCell(0).setCellValue("Generated: " + java.time.LocalDate.now().format(FMT)
                + (status != null ? " | Status: " + status : " | All Statuses"));

        sheet.createRow(2); // blank

        // Header Row
        String[] headers = {"#", "Invoice No", "Vendor", "Invoice Date", "Amount (₹)",
                "Client", "Status", "AI Risk Score", "Created At"};
        Row headerRow = sheet.createRow(3);
        for (int i = 0; i < headers.length; i++) {
            Cell c = headerRow.createCell(i);
            c.setCellValue(headers[i]);
            c.setCellStyle(headerStyle);
        }

        // Data rows
        XSSFCellStyle altStyle = wb.createCellStyle();
        altStyle.setFillForegroundColor(new XSSFColor(new byte[]{(byte)217, (byte)225, (byte)242}, null));
        altStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

        int rowNum = 4;
        int seq = 1;
        for (Invoice inv : invoices) {
            Row row = sheet.createRow(rowNum++);
            if (rowNum % 2 == 0) {
                for (int i = 0; i < headers.length; i++) row.createCell(i).setCellStyle(altStyle);
            }
            Cell cell = row.getCell(0) == null ? row.createCell(0) : row.getCell(0);
            row.createCell(0).setCellValue(seq++);
            row.createCell(1).setCellValue(inv.getInvoiceNumber());
            row.createCell(2).setCellValue(inv.getVendor().getName());
            row.createCell(3).setCellValue(inv.getInvoiceDate().format(FMT));
            row.createCell(4).setCellValue(inv.getAmount().doubleValue());
            row.createCell(5).setCellValue(inv.getClientName() != null ? inv.getClientName() : "");
            row.createCell(6).setCellValue(inv.getStatus().name());
            row.createCell(7).setCellValue(inv.getAiRiskScore() != null ? inv.getAiRiskScore().doubleValue() : 0);
            row.createCell(8).setCellValue(inv.getCreatedAt().format(DateTimeFormatter.ofPattern("dd-MM-yyyy HH:mm")));
        }

        // Auto-size columns
        for (int i = 0; i < headers.length; i++) {
            sheet.autoSizeColumn(i);
        }

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        wb.write(out);
        wb.close();
        return out.toByteArray();
    }

    public byte[] generatePendencyReport() throws IOException {
        XSSFWorkbook wb = new XSSFWorkbook();
        XSSFSheet sheet = wb.createSheet("Pendency Report");

        Row header = sheet.createRow(0);
        header.createCell(0).setCellValue("Stage");
        header.createCell(1).setCellValue("Count");

        String[][] stages = {
            {"DRAFT", String.valueOf(invoiceRepository.countByStatus(InvoiceStatus.DRAFT))},
            {"PENDING_APPROVAL", String.valueOf(invoiceRepository.countByStatus(InvoiceStatus.PENDING_APPROVAL))},
            {"APPROVED", String.valueOf(invoiceRepository.countByStatus(InvoiceStatus.APPROVED))},
            {"REJECTED", String.valueOf(invoiceRepository.countByStatus(InvoiceStatus.REJECTED))},
            {"PAID", String.valueOf(invoiceRepository.countByStatus(InvoiceStatus.PAID))},
        };

        int rowNum = 1;
        for (String[] s : stages) {
            Row row = sheet.createRow(rowNum++);
            row.createCell(0).setCellValue(s[0]);
            row.createCell(1).setCellValue(Long.parseLong(s[1]));
        }

        sheet.autoSizeColumn(0);
        sheet.autoSizeColumn(1);

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        wb.write(out);
        wb.close();
        return out.toByteArray();
    }
}

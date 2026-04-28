package com.vims.service;

import com.vims.entity.Invoice;
import com.vims.repository.InvoiceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.sourceforge.tess4j.Tesseract;
import net.sourceforge.tess4j.TesseractException;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.awt.image.BufferedImage;
import java.io.File;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class OcrService {

    private final InvoiceRepository invoiceRepository;
    private final AiService aiService;

    private static final int MIN_DIGITAL_TEXT_LEN = 30;
    private static final float OCR_DPI = 200f;
    private static final int MAX_PDF_PAGES = 3;

    /**
     * Async entry point: extract text from invoice file, save it, then trigger AI analysis.
     * Chains OCR → AI so the AI always has OCR text available as context.
     */
    @Async
    public void extractAndAnalyzeAsync(UUID invoiceId) {
        try {
            Invoice invoice = invoiceRepository.findById(invoiceId).orElse(null);
            if (invoice == null) return;

            String text = "";
            if (invoice.getFilePath() != null && !invoice.getFilePath().isBlank()) {
                text = extractText(invoice.getFilePath(), invoice.getFileType());
                log.info("OCR complete for {}: {} chars extracted", invoice.getInvoiceNumber(), text.length());
            }

            saveOcrText(invoiceId, text);

            // Re-fetch for AI so it gets the saved OCR text
            invoiceRepository.findById(invoiceId).ifPresent(aiService::analyzeInvoiceAsync);

        } catch (Exception e) {
            log.warn("OCR pipeline failed for {}: {}", invoiceId, e.getMessage());
            saveOcrText(invoiceId, "");
            invoiceRepository.findById(invoiceId).ifPresent(aiService::analyzeInvoiceAsync);
        }
    }

    @Transactional
    public void saveOcrText(UUID invoiceId, String text) {
        invoiceRepository.findById(invoiceId).ifPresent(inv -> {
            inv.setOcrText(text != null ? text : "");
            invoiceRepository.save(inv);
        });
    }

    /**
     * Extracts text from a file. PDF: tries digital text first, falls back to OCR.
     * Images: direct OCR.
     */
    public String extractText(String filePath, String fileType) {
        File file = new File(filePath);
        if (!file.exists() || fileType == null) return "";
        try {
            if (fileType.contains("pdf")) return extractFromPdf(file);
            if (fileType.startsWith("image/")) return ocrFile(file);
        } catch (UnsatisfiedLinkError e) {
            log.warn("Tesseract not found. Run: brew install tesseract");
        } catch (Exception e) {
            log.warn("Text extraction error: {}", e.getMessage());
        }
        return "";
    }

    private String extractFromPdf(File file) throws Exception {
        try (PDDocument doc = Loader.loadPDF(file)) {
            // Try native text layer first (fast, works for digital PDFs)
            String text = new PDFTextStripper().getText(doc).trim();
            if (text.length() >= MIN_DIGITAL_TEXT_LEN) return text;

            // Scanned PDF: render pages as images and OCR them
            PDFRenderer renderer = new PDFRenderer(doc);
            StringBuilder sb = new StringBuilder();
            int pages = Math.min(doc.getNumberOfPages(), MAX_PDF_PAGES);
            for (int i = 0; i < pages; i++) {
                BufferedImage img = renderer.renderImageWithDPI(i, OCR_DPI);
                String pageText = ocrImage(img);
                if (!pageText.isBlank()) {
                    if (i > 0) sb.append("\n\n--- Page ").append(i + 1).append(" ---\n\n");
                    sb.append(pageText);
                }
            }
            return sb.toString().trim();
        }
    }

    private String ocrFile(File file) throws TesseractException {
        return buildTesseract().doOCR(file).trim();
    }

    private String ocrImage(BufferedImage image) throws TesseractException {
        return buildTesseract().doOCR(image).trim();
    }

    private Tesseract buildTesseract() {
        Tesseract t = new Tesseract();
        t.setDatapath(findTessDataPath());
        t.setLanguage("eng");
        t.setPageSegMode(1);  // Automatic page segmentation with OSD
        t.setOcrEngineMode(1); // LSTM only
        return t;
    }

    private String findTessDataPath() {
        String[] candidates = {
            System.getenv("TESSDATA_PREFIX"),
            "/opt/homebrew/share/tessdata",           // macOS Apple Silicon
            "/usr/local/share/tessdata",              // macOS Intel / Linux brew
            "/usr/share/tesseract-ocr/5/tessdata",    // Ubuntu 22+
            "/usr/share/tesseract-ocr/4.00/tessdata", // Ubuntu 20
            "/usr/share/tessdata",
        };
        for (String p : candidates) {
            if (p != null && new File(p).exists()) return p;
        }
        return "/usr/share/tessdata";
    }
}

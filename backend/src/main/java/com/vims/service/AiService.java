package com.vims.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.vims.entity.Invoice;
import com.vims.repository.InvoiceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.net.URI;
import java.net.http.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.*;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AiService {

    private final InvoiceRepository invoiceRepository;
    private final ObjectMapper objectMapper;

    @Value("${ai.huggingface.token:}")
    private String hfToken;

    @Value("${ai.huggingface.api-url}")
    private String apiUrl;

    @Value("${ai.huggingface.classifier-model}")
    private String classifierModel;

    /**
     * Asynchronously analyze invoice for anomalies using HuggingFace zero-shot classification.
     * Free tier: No billing required. Rate limit: ~30k chars/month on free.
     */
    @Async
    public void analyzeInvoiceAsync(Invoice invoice) {
        UUID invoiceId = invoice.getId();
        try {
            // Reload fresh from DB — the passed entity is detached (different thread/session)
            Invoice fresh = invoiceRepository.findById(invoiceId).orElse(null);
            if (fresh == null) return;

            String analysis = analyzeInvoice(fresh);
            BigDecimal riskScore = calculateRiskScore(fresh);
            boolean anomaly = riskScore.compareTo(BigDecimal.valueOf(65)) > 0;

            fresh.setAiAnalysis(analysis);
            fresh.setAiRiskScore(riskScore);
            fresh.setAiAnomalyFlag(anomaly);
            invoiceRepository.save(fresh);
            log.info("AI analysis complete for invoice: {}, risk: {}", fresh.getInvoiceNumber(), riskScore);
        } catch (Exception e) {
            log.warn("AI analysis failed for invoice {}: {}", invoiceId, e.getMessage());
            invoiceRepository.findById(invoiceId).ifPresent(inv -> {
                inv.setAiAnalysis("AI analysis unavailable");
                inv.setAiRiskScore(BigDecimal.ZERO);
                inv.setAiAnomalyFlag(false);
                invoiceRepository.save(inv);
            });
        }
    }

    public String analyzeInvoice(Invoice invoice) {
        if (hfToken == null || hfToken.isBlank()) {
            return buildLocalAnalysis(invoice);
        }
        try {
            return callHuggingFaceClassifier(invoice);
        } catch (Exception e) {
            log.warn("HuggingFace call failed, using local analysis: {}", e.getMessage());
            return buildLocalAnalysis(invoice);
        }
    }

    /**
     * Calls HuggingFace zero-shot classification (completely free).
     * Uses facebook/bart-large-mnli model.
     */
    private String callHuggingFaceClassifier(Invoice invoice) throws Exception {
        String ocrSnippet = (invoice.getOcrText() != null && !invoice.getOcrText().isBlank())
            ? " | OCR text excerpt: " + invoice.getOcrText().substring(0, Math.min(300, invoice.getOcrText().length()))
            : "";
        String text = String.format(
            "Invoice %s from vendor %s, amount: %.2f, client: %s, date: %s%s",
            invoice.getInvoiceNumber(),
            invoice.getVendor().getName(),
            invoice.getAmount(),
            invoice.getClientName(),
            invoice.getInvoiceDate(),
            ocrSnippet
        );

        Map<String, Object> payload = new HashMap<>();
        payload.put("inputs", text);
        payload.put("parameters", Map.of(
            "candidate_labels", List.of(
                "normal invoice",
                "suspicious amount",
                "duplicate risk",
                "high value transaction",
                "irregular date"
            )
        ));

        String body = objectMapper.writeValueAsString(payload);

        HttpClient client = HttpClient.newHttpClient();
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(apiUrl + "/" + classifierModel))
                .header("Authorization", "Bearer " + hfToken)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();

        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() == 200) {
            JsonNode root = objectMapper.readTree(response.body());
            JsonNode labels = root.get("labels");
            JsonNode scores = root.get("scores");

            if (labels != null && scores != null) {
                String topLabel = labels.get(0).asText();
                double topScore = scores.get(0).asDouble();
                return String.format("Classification: %s (confidence: %.1f%%). %s",
                        topLabel, topScore * 100, getRecommendation(topLabel));
            }
        }
        return buildLocalAnalysis(invoice);
    }

    /**
     * Rule-based local analysis (works with NO API key).
     */
    private String buildLocalAnalysis(Invoice invoice) {
        List<String> findings = new ArrayList<>();

        // Check amount thresholds
        BigDecimal amount = invoice.getAmount();
        if (amount.compareTo(BigDecimal.valueOf(500000)) > 0) {
            findings.add("⚠️ High value invoice (>5L) - requires extra scrutiny");
        } else if (amount.compareTo(BigDecimal.valueOf(100000)) > 0) {
            findings.add("ℹ️ Significant amount (>1L) - standard review recommended");
        } else {
            findings.add("✅ Amount within normal range");
        }

        // Check invoice date
        if (invoice.getInvoiceDate().isBefore(java.time.LocalDate.now().minusDays(90))) {
            findings.add("⚠️ Invoice date is older than 90 days");
        }
        if (invoice.getInvoiceDate().isAfter(java.time.LocalDate.now().plusDays(1))) {
            findings.add("⚠️ Future dated invoice - verify authenticity");
        }

        // Check description
        if (invoice.getDescription() == null || invoice.getDescription().isBlank()) {
            findings.add("⚠️ No description provided - request details from vendor");
        }

        // Check file attachment
        if (invoice.getFilePath() == null || invoice.getFilePath().isBlank()) {
            findings.add("⚠️ No supporting document attached");
        } else {
            findings.add("✅ Supporting document attached");
        }

        // OCR amount cross-check
        if (invoice.getOcrText() != null && !invoice.getOcrText().isBlank()) {
            BigDecimal ocrAmount = extractAmountFromOcr(invoice.getOcrText());
            if (ocrAmount != null) {
                BigDecimal pct = invoice.getAmount().subtract(ocrAmount).abs()
                        .multiply(BigDecimal.valueOf(100))
                        .divide(ocrAmount.max(BigDecimal.ONE), 2, java.math.RoundingMode.HALF_UP);
                if (pct.compareTo(BigDecimal.valueOf(5)) > 0) {
                    findings.add(String.format("⚠️ Amount mismatch: entered ₹%.2f vs OCR-detected ₹%.2f (%.1f%% diff)",
                            invoice.getAmount(), ocrAmount, pct));
                } else {
                    findings.add("✅ Amount matches OCR extracted value");
                }
            }
        }

        return "AI Analysis (Rule-Based): " + String.join(" | ", findings);
    }

    /**
     * Calculate risk score 0-100 based on multiple factors.
     */
    public BigDecimal calculateRiskScore(Invoice invoice) {
        double score = 0;

        // Amount risk (0-40 points)
        BigDecimal amount = invoice.getAmount();
        if (amount.compareTo(BigDecimal.valueOf(1000000)) > 0) score += 40;
        else if (amount.compareTo(BigDecimal.valueOf(500000)) > 0) score += 25;
        else if (amount.compareTo(BigDecimal.valueOf(100000)) > 0) score += 15;
        else score += 5;

        // Date risk (0-20 points)
        if (invoice.getInvoiceDate().isBefore(java.time.LocalDate.now().minusDays(90))) score += 20;
        else if (invoice.getInvoiceDate().isBefore(java.time.LocalDate.now().minusDays(30))) score += 10;

        // Missing info risk (0-20 points)
        if (invoice.getDescription() == null || invoice.getDescription().isBlank()) score += 10;
        if (invoice.getFilePath() == null || invoice.getFilePath().isBlank()) score += 10;

        // Round number risk (0-20 points) - suspiciously round amounts
        if (amount.remainder(BigDecimal.valueOf(10000)).compareTo(BigDecimal.ZERO) == 0) score += 20;
        else if (amount.remainder(BigDecimal.valueOf(1000)).compareTo(BigDecimal.ZERO) == 0) score += 10;

        return BigDecimal.valueOf(Math.min(score, 100));
    }

    private BigDecimal extractAmountFromOcr(String text) {
        // Match patterns like: Total: 1,23,456.78 / Rs. 50000 / ₹1,000.00 / INR 2500
        Pattern p = Pattern.compile(
            "(?i)(?:total|amount|grand\\s+total|net\\s+amount|invoice\\s+amount)?\\s*[₹Rs\\.INR]*\\s*([0-9]{1,3}(?:[,.]?[0-9]{3})*(?:\\.[0-9]{1,2})?)"
        );
        Matcher m = p.matcher(text);
        BigDecimal largest = null;
        while (m.find()) {
            try {
                String raw = m.group(1).replace(",", "");
                BigDecimal val = new BigDecimal(raw);
                if (largest == null || val.compareTo(largest) > 0) largest = val;
            } catch (NumberFormatException ignored) {}
        }
        return largest;
    }

    private String getRecommendation(String label) {
        return switch (label) {
            case "suspicious amount" -> "Recommend thorough verification before approval.";
            case "duplicate risk"    -> "Check for existing invoices with similar details.";
            case "high value transaction" -> "Escalate for senior approval review.";
            case "irregular date"    -> "Verify invoice date with vendor.";
            default -> "Standard processing applicable.";
        };
    }
}

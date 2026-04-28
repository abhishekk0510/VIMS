package com.vims.service;

import com.vims.entity.Invoice;
import com.vims.entity.WorkflowLevel;
import com.vims.enums.Role;
import com.vims.repository.UserRepository;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

    private final JavaMailSender mailSender;
    private final UserRepository userRepository;

    @Value("${app.mail.from}")
    private String from;

    private static final String APP_URL = "http://localhost:3001";
    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd MMM yyyy");

    // ─── Public notification methods ────────────────────────────────────────────

    /** Called when vendor submits invoice — notifies Step-1 approvers */
    @Async
    public void notifyInvoiceSubmitted(Invoice invoice, String vendorName, WorkflowLevel firstLevel) {
        try {
            String subject = "🔔 Action Required: New Invoice Submitted — " + invoice.getInvoiceNumber();
            String body = buildApprovalRequestEmail(
                    firstLevel.getLevelName(),
                    invoice,
                    vendorName,
                    "A new invoice has been submitted and is awaiting your review at the <strong>" + firstLevel.getLevelName() + "</strong> stage.",
                    "This invoice was submitted by the vendor and has entered the approval workflow. Please review it at your earliest convenience.",
                    null
            );
            sendToRole(firstLevel.getApproverRole(), invoice.getTenantId(), subject, body);
        } catch (Exception e) {
            log.warn("Failed to send submission notification for {}: {}", invoice.getInvoiceNumber(), e.getMessage());
        }
    }

    /** Called when a level approves but it's NOT the final level — notifies next level approvers */
    @Async
    public void notifyLevelApproved(Invoice invoice, String vendorName, String approverName, WorkflowLevel approvedLevel, WorkflowLevel nextLevel) {
        try {
            String subject = "✅ Action Required: Invoice Approved at " + approvedLevel.getLevelName() + " — " + invoice.getInvoiceNumber();
            String body = buildApprovalRequestEmail(
                    nextLevel.getLevelName(),
                    invoice,
                    vendorName,
                    "Invoice <strong>" + invoice.getInvoiceNumber() + "</strong> has been approved at the <strong>"
                            + approvedLevel.getLevelName() + "</strong> stage by <strong>" + approverName + "</strong>.",
                    "The invoice is now pending your review at the <strong>" + nextLevel.getLevelName()
                            + "</strong> stage. Please log in to VIMS and take the appropriate action.",
                    null
            );
            sendToRole(nextLevel.getApproverRole(), invoice.getTenantId(), subject, body);
        } catch (Exception e) {
            log.warn("Failed to send level-approved notification for {}: {}", invoice.getInvoiceNumber(), e.getMessage());
        }
    }

    /** Called on final level approval — notifies vendor */
    @Async
    public void notifyFinalApproved(Invoice invoice, String vendorName, String vendorEmail, String approverName, WorkflowLevel lastLevel) {
        try {
            String subject = "🎉 Your Invoice Has Been Fully Approved — " + invoice.getInvoiceNumber();
            String body = buildStatusUpdateEmail(
                    vendorName,
                    invoice,
                    vendorName,
                    "approved",
                    "#10b981",
                    "✅ Invoice Approved",
                    "Congratulations! Your invoice <strong>" + invoice.getInvoiceNumber()
                            + "</strong> has successfully cleared all approval stages and has been <strong>fully approved</strong>.",
                    "Final approval was given by <strong>" + approverName + "</strong> at the <strong>" + lastLevel.getLevelName()
                            + "</strong> stage. Your payment will be processed shortly.",
                    null
            );
            sendToEmail(vendorEmail, subject, body);
        } catch (Exception e) {
            log.warn("Failed to send final-approved notification for {}: {}", invoice.getInvoiceNumber(), e.getMessage());
        }
    }

    /** Called when an approver rejects — notifies vendor with rejection details */
    @Async
    public void notifyRejected(Invoice invoice, String vendorName, String vendorEmail, String rejectedByName, WorkflowLevel rejectedAtLevel, String remarks) {
        try {
            String subject = "❌ Invoice Rejected — Action Required: " + invoice.getInvoiceNumber();
            String body = buildStatusUpdateEmail(
                    vendorName,
                    invoice,
                    vendorName,
                    "rejected",
                    "#ef4444",
                    "❌ Invoice Rejected",
                    "Your invoice <strong>" + invoice.getInvoiceNumber() + "</strong> has been <strong>rejected</strong> at the <strong>"
                            + rejectedAtLevel.getLevelName() + "</strong> stage.",
                    "Please review the rejection reason below, make the necessary corrections, and resubmit the invoice through the VIMS portal.",
                    remarks
            );
            sendToEmail(vendorEmail, subject, body);
        } catch (Exception e) {
            log.warn("Failed to send rejection notification for {}: {}", invoice.getInvoiceNumber(), e.getMessage());
        }
    }

    /** Called when finance marks invoice as paid */
    @Async
    public void notifyPaymentDone(Invoice invoice, String vendorName, String vendorEmail, String processedBy) {
        try {
            String subject = "💰 Payment Processed for Invoice " + invoice.getInvoiceNumber();
            String body = buildStatusUpdateEmail(
                    vendorName,
                    invoice,
                    vendorName,
                    "paid",
                    "#8b5cf6",
                    "💰 Payment Processed",
                    "Great news! Payment has been successfully processed for your invoice <strong>" + invoice.getInvoiceNumber() + "</strong>.",
                    "The payment was processed by <strong>" + processedBy + "</strong>. Please allow 2–3 business days for the funds to reflect in your bank account as per standard settlement timelines.",
                    null
            );
            sendToEmail(vendorEmail, subject, body);
        } catch (Exception e) {
            log.warn("Failed to send payment notification for {}: {}", invoice.getInvoiceNumber(), e.getMessage());
        }
    }

    // ─── HTML template builders ──────────────────────────────────────────────────

    private String buildApprovalRequestEmail(String recipientRole, Invoice invoice,
                                              String vendorName, String headlineHtml,
                                              String bodyTextHtml, String remarks) {
        String amt = "₹" + String.format("%,.2f", invoice.getAmount() != null ? invoice.getAmount() : BigDecimal.ZERO);
        String date = invoice.getInvoiceDate() != null ? invoice.getInvoiceDate().format(DATE_FMT) : "—";
        String invoiceUrl = APP_URL + "/invoices/" + invoice.getId();

        return wrapInBase(
                "<div style='background:#fffbeb;border-left:4px solid #f59e0b;border-radius:8px;padding:16px 20px;margin-bottom:24px'>"
                + "<p style='margin:0;font-size:13px;color:#92400e;font-weight:600;text-transform:uppercase;letter-spacing:0.05em'>Action Required</p>"
                + "<p style='margin:6px 0 0;font-size:15px;color:#78350f'>" + headlineHtml + "</p>"
                + "</div>"
                + "<p style='color:#374151;font-size:15px;line-height:1.7;margin:0 0 20px'>" + bodyTextHtml + "</p>"
                + invoiceDetailsTable(invoice.getInvoiceNumber(), vendorName, amt, date, invoice.getClientName())
                + (remarks != null ? remarksBox(remarks, "#fef3c7", "#92400e") : "")
                + "<div style='text-align:center;margin:28px 0'>"
                + "<a href='" + invoiceUrl + "' style='background:#3b82f6;color:#fff;text-decoration:none;padding:13px 32px;border-radius:8px;font-weight:600;font-size:15px;display:inline-block'>Review Invoice →</a>"
                + "</div>"
        );
    }

    private String buildStatusUpdateEmail(String recipientName, Invoice invoice,
                                           String vendorName, String statusLabel,
                                           String accentColor, String headline,
                                           String headlineBodyHtml, String detailHtml,
                                           String remarks) {
        String amt = "₹" + String.format("%,.2f", invoice.getAmount() != null ? invoice.getAmount() : BigDecimal.ZERO);
        String date = invoice.getInvoiceDate() != null ? invoice.getInvoiceDate().format(DATE_FMT) : "—";
        String invoiceUrl = APP_URL + "/invoices/" + invoice.getId();
        String remarksBgColor  = statusLabel.equals("rejected") ? "#fef2f2" : "#f0fdf4";
        String remarksTextColor = statusLabel.equals("rejected") ? "#991b1b" : "#166534";

        return wrapInBase(
                "<div style='background:" + accentColor + "1a;border-left:4px solid " + accentColor + ";border-radius:8px;padding:16px 20px;margin-bottom:24px'>"
                + "<p style='margin:0;font-size:20px;font-weight:700;color:#111827'>" + headline + "</p>"
                + "</div>"
                + "<p style='color:#374151;font-size:15px;line-height:1.7;margin:0 0 16px'>Dear <strong>" + recipientName + "</strong>,</p>"
                + "<p style='color:#374151;font-size:15px;line-height:1.7;margin:0 0 20px'>" + headlineBodyHtml + "</p>"
                + "<p style='color:#6b7280;font-size:14px;line-height:1.7;margin:0 0 20px'>" + detailHtml + "</p>"
                + invoiceDetailsTable(invoice.getInvoiceNumber(), vendorName, amt, date, invoice.getClientName())
                + (remarks != null && !remarks.isBlank() ? remarksBox(remarks, remarksBgColor, remarksTextColor) : "")
                + "<div style='text-align:center;margin:28px 0'>"
                + "<a href='" + invoiceUrl + "' style='background:#0f172a;color:#fff;text-decoration:none;padding:13px 32px;border-radius:8px;font-weight:600;font-size:15px;display:inline-block'>View Invoice in VIMS →</a>"
                + "</div>"
        );
    }

    private String invoiceDetailsTable(String number, String vendor, String amount, String date, String client) {
        return "<table width='100%' cellpadding='0' cellspacing='0' style='border-collapse:collapse;border-radius:10px;overflow:hidden;border:1px solid #e5e7eb;margin-bottom:20px'>"
                + "<thead><tr style='background:#f8fafc'>"
                + "<th colspan='2' style='padding:10px 16px;text-align:left;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;border-bottom:1px solid #e5e7eb'>Invoice Details</th>"
                + "</tr></thead><tbody>"
                + detailRow("Invoice No.", "<strong style='font-family:monospace;color:#1d4ed8'>" + number + "</strong>", "#ffffff")
                + detailRow("Vendor",      vendor,                                                                           "#f9fafb")
                + detailRow("Amount",      "<strong style='color:#059669;font-size:16px'>" + amount + "</strong>",           "#ffffff")
                + detailRow("Invoice Date", date,                                                                            "#f9fafb")
                + (client != null && !client.isBlank() ? detailRow("Client", client, "#ffffff") : "")
                + "</tbody></table>";
    }

    private String detailRow(String label, String value, String bg) {
        return "<tr style='background:" + bg + "'>"
                + "<td style='padding:10px 16px;font-size:13px;color:#6b7280;font-weight:500;width:40%;border-bottom:1px solid #f3f4f6'>" + label + "</td>"
                + "<td style='padding:10px 16px;font-size:14px;color:#111827;border-bottom:1px solid #f3f4f6'>" + value + "</td>"
                + "</tr>";
    }

    private String remarksBox(String remarks, String bg, String color) {
        return "<div style='background:" + bg + ";border-radius:8px;padding:14px 18px;margin-bottom:20px'>"
                + "<p style='margin:0 0 4px;font-size:12px;font-weight:700;color:" + color + ";text-transform:uppercase;letter-spacing:0.06em'>Remarks</p>"
                + "<p style='margin:0;font-size:14px;color:" + color + ";line-height:1.6'>" + escapeHtml(remarks) + "</p>"
                + "</div>";
    }

    private String wrapInBase(String content) {
        return "<!DOCTYPE html><html><head><meta charset='UTF-8'>"
                + "<meta name='viewport' content='width=device-width,initial-scale=1'></head>"
                + "<body style='margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,\"Segoe UI\",Roboto,sans-serif'>"
                + "<table width='100%' cellpadding='0' cellspacing='0' style='padding:32px 16px'><tr><td align='center'>"
                + "<table width='100%' cellpadding='0' cellspacing='0' style='max-width:580px'>"
                // Header
                + "<tr><td style='background:linear-gradient(135deg,#1e3a5f 0%,#0f172a 100%);border-radius:12px 12px 0 0;padding:24px 32px'>"
                + "<table width='100%'><tr>"
                + "<td><div style='display:inline-block;background:#3b82f6;border-radius:8px;padding:8px 12px;margin-right:12px;vertical-align:middle'>"
                + "<span style='color:#fff;font-size:16px;font-weight:800'>V</span></div>"
                + "<span style='color:#fff;font-size:20px;font-weight:700;vertical-align:middle'>VIMS</span>"
                + "<span style='color:#94a3b8;font-size:13px;vertical-align:middle;margin-left:8px'>— Vendor Invoice Management System</span></td>"
                + "</tr></table>"
                + "</td></tr>"
                // Body
                + "<tr><td style='background:#ffffff;padding:32px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb'>"
                + content
                + "</td></tr>"
                // Footer
                + "<tr><td style='background:#f8fafc;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;padding:20px 32px;text-align:center'>"
                + "<p style='margin:0;font-size:12px;color:#94a3b8'>This is an automated notification from <strong>VIMS — FinanceAI Enterprise</strong>.<br>"
                + "Please do not reply to this email. Log in to <a href='" + APP_URL + "' style='color:#3b82f6;text-decoration:none'>VIMS</a> for any actions.</p>"
                + "</td></tr>"
                + "</table></td></tr></table>"
                + "</body></html>";
    }

    // ─── Delivery helpers ────────────────────────────────────────────────────────

    private void sendToRole(Role role, String subject, String htmlBody) {
        sendToRole(role, null, subject, htmlBody);
    }

    private void sendToRole(Role role, java.util.UUID tenantId, String subject, String htmlBody) {
        List<com.vims.entity.User> users = (tenantId != null)
                ? userRepository.findByTenantIdAndRoleAndEnabled(tenantId, role, true)
                : userRepository.findByRoleAndEnabled(role, true);
        if (users.isEmpty()) {
            log.warn("No active users found for role {} (tenant: {}) — skipping email: {}", role, tenantId, subject);
            return;
        }
        users.forEach(u -> sendToEmail(u.getEmail(), subject, htmlBody));
    }

    private void sendToEmail(String to, String subject, String htmlBody) {
        try {
            MimeMessage msg = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(msg, true, "UTF-8");
            helper.setFrom(from);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(htmlBody, true);
            mailSender.send(msg);
            log.info("Email sent → {} | {}", to, subject);
        } catch (Exception e) {
            log.warn("Email delivery failed → {} | {} | {}", to, subject, e.getMessage());
        }
    }

    private String escapeHtml(String text) {
        if (text == null) return "";
        return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;");
    }
}

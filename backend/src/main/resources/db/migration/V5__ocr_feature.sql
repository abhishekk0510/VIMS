-- V5: Add OCR text column to invoices
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS ocr_text TEXT;

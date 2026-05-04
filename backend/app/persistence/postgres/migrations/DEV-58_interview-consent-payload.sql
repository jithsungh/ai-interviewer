-- Migration: DEV-58 — Persist detailed consent payload on submissions
-- Branch: feature/DEV-58-consent-payload
-- Date: 2026-05-03
--
-- Purpose:
--   Store the detailed consent checklist data submitted by candidates
--   before interview start. This enables auditability and consent re-validation
--   on refresh.
--
-- ============================================================
-- UP MIGRATION
-- ============================================================

ALTER TABLE public.interview_submissions
    ADD COLUMN IF NOT EXISTS consent_payload JSONB;

-- ============================================================
-- DOWN MIGRATION
-- ============================================================
-- ALTER TABLE public.interview_submissions
--     DROP COLUMN IF EXISTS consent_payload;

-- Migration: DEV-59 — Add duration_ms to proctoring_recordings
-- Date: 2026-05-04
--
-- ============================================================
-- UP MIGRATION
-- ============================================================

ALTER TABLE public.proctoring_recordings
    ADD COLUMN IF NOT EXISTS duration_ms bigint;

-- ============================================================
-- DOWN MIGRATION
-- ============================================================
-- ALTER TABLE public.proctoring_recordings
--     DROP COLUMN IF EXISTS duration_ms;

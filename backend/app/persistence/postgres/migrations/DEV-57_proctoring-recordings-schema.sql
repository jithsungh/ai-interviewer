-- UP: Create proctoring_recordings table for storing screen recording metadata
-- DOWN: Drop proctoring_recordings table

-- ========================================
-- UP Migration
-- ========================================

-- Create sequence for ID generation
CREATE SEQUENCE public.proctoring_recordings_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

-- Create proctoring_recordings table
CREATE TABLE public.proctoring_recordings (
    id bigint NOT NULL DEFAULT nextval('public.proctoring_recordings_id_seq'::regclass),
    interview_submission_id bigint NOT NULL,
    artifact_id text NOT NULL UNIQUE,
    storage_path text NOT NULL,
    mime_type text NOT NULL DEFAULT 'video/webm',
    file_size_bytes bigint NOT NULL,
    upload_started_at timestamp with time zone,
    upload_completed_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    PRIMARY KEY (id)
);

-- Create index for submission lookups
CREATE INDEX idx_proctoring_recordings_submission_id ON public.proctoring_recordings (interview_submission_id);

-- Create foreign key to interview_submissions
ALTER TABLE public.proctoring_recordings
ADD CONSTRAINT fk_proctoring_recordings_submission
FOREIGN KEY (interview_submission_id)
REFERENCES public.interview_submissions (id) ON DELETE CASCADE;

-- ========================================
-- DOWN Migration
-- ========================================
-- DROP TABLE IF EXISTS public.proctoring_recordings CASCADE;
-- DROP SEQUENCE IF EXISTS public.proctoring_recordings_id_seq;

BEGIN;

DROP INDEX IF EXISTS public.uq_candidate_window_role_non_practice;

DO $$
DECLARE
    _practice_window_id INTEGER;
BEGIN
    SELECT id INTO _practice_window_id
    FROM public.interview_submission_windows
    WHERE name = '__practice__';

    IF _practice_window_id IS NOT NULL THEN
        EXECUTE format(
            'CREATE UNIQUE INDEX IF NOT EXISTS uq_candidate_window_role_non_practice '
            'ON public.interview_submissions (candidate_id, window_id, role_id) '
            'WHERE window_id <> %s AND status IN (''pending'', ''in_progress'')',
            _practice_window_id
        );
    END IF;
END $$;

COMMIT;

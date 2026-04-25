-- Add morning/afternoon session support to attendance (and class_sessions if present).
-- Classes meet 5 days a week with separate morning and afternoon sessions, so a
-- single attendance row per student per day is insufficient.

-- =========================================================
-- attendance: add `session` column and adjust unique key
-- =========================================================
ALTER TABLE public.attendance
    ADD COLUMN IF NOT EXISTS session TEXT NOT NULL DEFAULT 'morning';

-- Re-add CHECK constraint defensively (skip if already there)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.attendance'::regclass
          AND conname = 'attendance_session_check'
    ) THEN
        ALTER TABLE public.attendance
            ADD CONSTRAINT attendance_session_check
            CHECK (session IN ('morning', 'afternoon'));
    END IF;
END $$;

-- Drop the previous unique constraint (student_id, date) if present
DO $$
DECLARE
    cons_name TEXT;
BEGIN
    SELECT conname INTO cons_name
    FROM pg_constraint
    WHERE conrelid = 'public.attendance'::regclass
      AND contype = 'u'
      AND pg_get_constraintdef(oid) ILIKE '%(student_id, date)%'
      AND pg_get_constraintdef(oid) NOT ILIKE '%session%';

    IF cons_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE public.attendance DROP CONSTRAINT %I', cons_name);
    END IF;
END $$;

-- Add new unique constraint on (student_id, date, session) if not present
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.attendance'::regclass
          AND contype = 'u'
          AND pg_get_constraintdef(oid) ILIKE '%(student_id, date, session)%'
    ) THEN
        ALTER TABLE public.attendance
            ADD CONSTRAINT attendance_student_date_session_key
            UNIQUE (student_id, date, session);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_attendance_student_date_session
    ON public.attendance(student_id, date, session);

-- =========================================================
-- class_sessions: add `session` column and adjust unique key
-- (only if the table already exists in this environment)
-- =========================================================
DO $$
DECLARE
    cons_name TEXT;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'class_sessions'
    ) THEN
        RETURN;
    END IF;

    EXECUTE 'ALTER TABLE public.class_sessions
             ADD COLUMN IF NOT EXISTS session TEXT NOT NULL DEFAULT ''morning''';

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.class_sessions'::regclass
          AND conname = 'class_sessions_session_check'
    ) THEN
        EXECUTE 'ALTER TABLE public.class_sessions
                 ADD CONSTRAINT class_sessions_session_check
                 CHECK (session IN (''morning'', ''afternoon''))';
    END IF;

    -- Drop unique constraints that don't include the new session column
    FOR cons_name IN
        SELECT conname FROM pg_constraint
        WHERE conrelid = 'public.class_sessions'::regclass
          AND contype = 'u'
          AND pg_get_constraintdef(oid) NOT ILIKE '%session%'
    LOOP
        EXECUTE format('ALTER TABLE public.class_sessions DROP CONSTRAINT %I', cons_name);
    END LOOP;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.class_sessions'::regclass
          AND contype = 'u'
          AND pg_get_constraintdef(oid) ILIKE '%session%'
    ) THEN
        EXECUTE 'ALTER TABLE public.class_sessions
                 ADD CONSTRAINT class_sessions_date_year_section_session_key
                 UNIQUE (date, year_level, section, session)';
    END IF;
END $$;

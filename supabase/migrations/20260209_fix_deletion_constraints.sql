-- Migration to fix student deletion error
-- The grade_history table has a foreign key to the grades table.
-- When a grade is deleted (e.g., during student deletion), the AFTER DELETE trigger tries to log the deletion.
-- This log entry fails because the referenced grade no longer exists.
-- Removing the hard FK constraint on grade_id allows the log to be created (or fail gracefully) without blocking the parent deletion.
-- Since the student_id also has an ON DELETE CASCADE on this table, the history will still be wiped appropriately.

ALTER TABLE public.grade_history DROP CONSTRAINT IF EXISTS grade_history_grade_id_fkey;

-- We keep the column for reference but without the hard enforcement during deletion.
-- Optional: Re-add as a nullable reference if needed, but for audit trails of deleted records, 
-- a hard FK is usually problematic.

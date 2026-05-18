-- ============================================================================
-- Drop legacy osg_mentor_schedule table.
--
-- Background: Three end (lead-mentor / mentor / assistant) schedule architecture
-- has been unified onto osg_staff_schedule. The legacy osg_mentor_schedule
-- (single-slot-per-day model used previously by mentor + assistant ends) is no
-- longer referenced by any backend code, mapper, controller, or test.
--
-- Test data only — no data migration required (per product owner direction).
-- Idempotent: IF EXISTS prevents error on subsequent runs.
-- ============================================================================

DROP TABLE IF EXISTS osg_mentor_schedule;

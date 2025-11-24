-- Allow zero values for support_staff_needed while keeping non-negative constraint
ALTER TABLE events
    DROP CONSTRAINT IF EXISTS check_support_staff_needed_positive;

ALTER TABLE events
    DROP CONSTRAINT IF EXISTS check_support_staff_needed_non_negative;

ALTER TABLE events
    ADD CONSTRAINT check_support_staff_needed_non_negative
    CHECK (support_staff_needed IS NULL OR support_staff_needed >= 0);


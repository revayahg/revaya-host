-- DATA PRESERVATION TEMPLATE FOR MESSAGING SYSTEM UPDATES
-- Use this template before making destructive changes to messaging tables
-- 
-- STEP 1: BACKUP EXISTING DATA
-- ================================

-- Create backup tables with timestamp (replace YYYYMMDD_HHMMSS with actual timestamp)
CREATE TABLE IF NOT EXISTS messages_backup_20250830_201729 AS 
SELECT * FROM public.messages;

CREATE TABLE IF NOT EXISTS message_threads_backup_20250830_201729 AS 
SELECT * FROM public.message_threads;

-- Verify backup row counts
SELECT 
    'messages_backup' as table_name, 
    COUNT(*) as row_count 
FROM messages_backup_20250830_201729
UNION ALL
SELECT 
    'message_threads_backup' as table_name, 
    COUNT(*) as row_count 
FROM message_threads_backup_20250830_201729;

-- STEP 2: SAFE MIGRATION PATTERN
-- ===============================

-- Create new tables with different names (example - update schema as needed)
CREATE TABLE IF NOT EXISTS messages_v2 (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id uuid NOT NULL,
    sender_id uuid NOT NULL,
    content text NOT NULL,
    created_at timestamptz DEFAULT NOW(),
    updated_at timestamptz DEFAULT NOW()
    -- Add your new columns here
);

CREATE TABLE IF NOT EXISTS message_threads_v2 (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id uuid NOT NULL,
    subject text,
    is_group boolean DEFAULT false,
    created_at timestamptz DEFAULT NOW(),
    updated_at timestamptz DEFAULT NOW()
    -- Add your new columns here
);

-- STEP 3: DATA MIGRATION WITH TRANSFORMATION
-- ==========================================

-- Migrate threads first (due to foreign key dependencies)
INSERT INTO message_threads_v2 (id, event_id, subject, is_group, created_at)
SELECT 
    id,
    event_id,
    subject,
    COALESCE(is_group, false),  -- Handle null values
    created_at
FROM message_threads_backup_20250830_201729;

-- Migrate messages
INSERT INTO messages_v2 (id, thread_id, sender_id, content, created_at)
SELECT 
    m.id,
    m.thread_id,
    m.sender_id,
    m.content,
    m.created_at
FROM messages_backup_20250830_201729 m
WHERE EXISTS (
    SELECT 1 FROM message_threads_v2 t 
    WHERE t.id = m.thread_id
);

-- STEP 4: VERIFICATION
-- ====================

-- Compare row counts
SELECT 
    'Original messages' as source, 
    COUNT(*) as count 
FROM messages_backup_20250830_201729
UNION ALL
SELECT 
    'Migrated messages' as source, 
    COUNT(*) as count 
FROM messages_v2;

-- Check for data integrity
SELECT 
    'Messages with invalid thread_id' as issue,
    COUNT(*) as count
FROM messages_v2 m
WHERE NOT EXISTS (
    SELECT 1 FROM message_threads_v2 t 
    WHERE t.id = m.thread_id
);

-- STEP 5: CUTOVER (Only after verification)
-- =========================================

-- Rename old tables to archive
-- ALTER TABLE messages RENAME TO messages_archive_20250830_201729;
-- ALTER TABLE message_threads RENAME TO message_threads_archive_20250830_201729;

-- Rename new tables to production names
-- ALTER TABLE messages_v2 RENAME TO messages;
-- ALTER TABLE message_threads_v2 RENAME TO message_threads;

-- STEP 6: CLEANUP (After confirming everything works)
-- ==================================================

-- Drop backup tables after successful migration (uncomment when ready)
-- DROP TABLE IF EXISTS messages_backup_20250830_201729;
-- DROP TABLE IF EXISTS message_threads_backup_20250830_201729;

-- ROLLBACK PLAN
-- =============
-- If something goes wrong, restore from backup:
-- DROP TABLE IF EXISTS messages;
-- DROP TABLE IF EXISTS message_threads;
-- ALTER TABLE messages_backup_20250830_201729 RENAME TO messages;
-- ALTER TABLE message_threads_backup_20250830_201729 RENAME TO message_threads;

-- USAGE NOTES:
-- ============
-- 1. Replace 20250830_201729 with actual timestamp when running (format: YYYYMMDD_HHMMSS)
-- 2. Test this on a development environment first
-- 3. Always verify row counts and data integrity before cutover
-- 4. Keep backups for at least 30 days after successful migration
-- 5. Document any data transformations needed for your specific schema changes
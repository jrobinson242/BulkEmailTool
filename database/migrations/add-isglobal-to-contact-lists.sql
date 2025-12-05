-- Migration: Add IsGlobal column to ContactLists table
-- This allows contact lists to be shared across all users

IF NOT EXISTS (
    SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'ContactLists' AND COLUMN_NAME = 'IsGlobal'
)
BEGIN
    ALTER TABLE ContactLists
    ADD IsGlobal BIT NOT NULL DEFAULT 0;
    
    PRINT 'IsGlobal column added to ContactLists table';
END
ELSE
BEGIN
    PRINT 'IsGlobal column already exists in ContactLists table';
END

PRINT 'Migration completed successfully';

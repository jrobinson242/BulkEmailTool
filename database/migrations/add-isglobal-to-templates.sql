-- Migration: Add IsGlobal column to Templates table
-- This allows templates to be shared across all users in the organization

-- Check if column exists before adding
IF NOT EXISTS (
    SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'Templates' AND COLUMN_NAME = 'IsGlobal'
)
BEGIN
    ALTER TABLE Templates
    ADD IsGlobal BIT DEFAULT 0;
    
    PRINT 'IsGlobal column added successfully to Templates table';
END
ELSE
BEGIN
    PRINT 'IsGlobal column already exists in Templates table';
END

-- Update all existing templates to be non-global by default
UPDATE Templates
SET IsGlobal = 0
WHERE IsGlobal IS NULL;

PRINT 'Migration completed successfully';

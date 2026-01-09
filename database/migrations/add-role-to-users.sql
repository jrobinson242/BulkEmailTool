-- Migration: Add Role column to Users table
ALTER TABLE Users ADD Role NVARCHAR(50) NOT NULL DEFAULT 'user';

-- Set john.robinson@rsc.com as superuser
UPDATE Users SET Role = 'superuser' WHERE Email = 'john.robinson@rsc.com';

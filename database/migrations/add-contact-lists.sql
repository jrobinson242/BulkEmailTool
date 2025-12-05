-- Migration: Add Contact Lists tables
-- This allows users to create custom lists and organize contacts

-- Create ContactLists table
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'ContactLists')
BEGIN
    CREATE TABLE ContactLists (
        ListId INT IDENTITY(1,1) PRIMARY KEY,
        UserId NVARCHAR(255) NOT NULL,
        Name NVARCHAR(255) NOT NULL,
        Description NVARCHAR(MAX),
        CreatedAt DATETIME2 DEFAULT GETDATE(),
        UpdatedAt DATETIME2,
        FOREIGN KEY (UserId) REFERENCES Users(UserId) ON DELETE CASCADE
    );
    
    CREATE INDEX IX_ContactLists_UserId ON ContactLists(UserId);
    
    PRINT 'ContactLists table created successfully';
END
ELSE
BEGIN
    PRINT 'ContactLists table already exists';
END

-- Create ContactListMembers table
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'ContactListMembers')
BEGIN
    CREATE TABLE ContactListMembers (
        ListMemberId INT IDENTITY(1,1) PRIMARY KEY,
        ListId INT NOT NULL,
        ContactId INT NOT NULL,
        AddedAt DATETIME2 DEFAULT GETDATE(),
        FOREIGN KEY (ListId) REFERENCES ContactLists(ListId) ON DELETE CASCADE,
        FOREIGN KEY (ContactId) REFERENCES Contacts(ContactId) ON DELETE NO ACTION,
        UNIQUE (ListId, ContactId)
    );
    
    CREATE INDEX IX_ContactListMembers_ListId ON ContactListMembers(ListId);
    CREATE INDEX IX_ContactListMembers_ContactId ON ContactListMembers(ContactId);
    
    PRINT 'ContactListMembers table created successfully';
END
ELSE
BEGIN
    PRINT 'ContactListMembers table already exists';
END

PRINT 'Migration completed successfully';

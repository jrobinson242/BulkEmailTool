-- BulkEmailTool Database Schema
-- Azure SQL Database

-- Users table (stores basic user info from Azure AD)
CREATE TABLE Users (
    UserId NVARCHAR(255) PRIMARY KEY,
    Email NVARCHAR(255) NOT NULL,
    DisplayName NVARCHAR(255),
    CreatedAt DATETIME2 DEFAULT GETDATE(),
    LastLoginAt DATETIME2
);

-- Contacts table
CREATE TABLE Contacts (
    ContactId INT IDENTITY(1,1) PRIMARY KEY,
    UserId NVARCHAR(255) NOT NULL,
    FirstName NVARCHAR(100),
    LastName NVARCHAR(100),
    Email NVARCHAR(255) NOT NULL,
    Company NVARCHAR(255),
    JobTitle NVARCHAR(255),
    Phone NVARCHAR(50),
    Tags NVARCHAR(MAX), -- Comma-separated tags
    CreatedAt DATETIME2 DEFAULT GETDATE(),
    UpdatedAt DATETIME2,
    FOREIGN KEY (UserId) REFERENCES Users(UserId) ON DELETE CASCADE
);

CREATE INDEX IX_Contacts_UserId ON Contacts(UserId);
CREATE INDEX IX_Contacts_Email ON Contacts(Email);

-- Templates table
CREATE TABLE Templates (
    TemplateId INT IDENTITY(1,1) PRIMARY KEY,
    UserId NVARCHAR(255) NOT NULL,
    Name NVARCHAR(255) NOT NULL,
    Subject NVARCHAR(500) NOT NULL,
    Body NVARCHAR(MAX) NOT NULL,
    Description NVARCHAR(MAX),
    Placeholders NVARCHAR(MAX), -- JSON array of placeholder names
    CreatedAt DATETIME2 DEFAULT GETDATE(),
    UpdatedAt DATETIME2,
    FOREIGN KEY (UserId) REFERENCES Users(UserId) ON DELETE CASCADE
);

CREATE INDEX IX_Templates_UserId ON Templates(UserId);

-- Campaigns table
CREATE TABLE Campaigns (
    CampaignId INT IDENTITY(1,1) PRIMARY KEY,
    UserId NVARCHAR(255) NOT NULL,
    Name NVARCHAR(255) NOT NULL,
    TemplateId INT NOT NULL,
    Status NVARCHAR(50) DEFAULT 'draft', -- draft, sending, sent, failed
    ScheduledAt DATETIME2,
    CreatedAt DATETIME2 DEFAULT GETDATE(),
    CompletedAt DATETIME2,
    FOREIGN KEY (UserId) REFERENCES Users(UserId) ON DELETE CASCADE,
    FOREIGN KEY (TemplateId) REFERENCES Templates(TemplateId)
);

CREATE INDEX IX_Campaigns_UserId ON Campaigns(UserId);
CREATE INDEX IX_Campaigns_Status ON Campaigns(Status);

-- Campaign Contacts (many-to-many relationship)
CREATE TABLE CampaignContacts (
    CampaignContactId INT IDENTITY(1,1) PRIMARY KEY,
    CampaignId INT NOT NULL,
    ContactId INT NOT NULL,
    FOREIGN KEY (CampaignId) REFERENCES Campaigns(CampaignId) ON DELETE CASCADE,
    FOREIGN KEY (ContactId) REFERENCES Contacts(ContactId) ON DELETE NO ACTION,
    UNIQUE (CampaignId, ContactId)
);

CREATE INDEX IX_CampaignContacts_CampaignId ON CampaignContacts(CampaignId);
CREATE INDEX IX_CampaignContacts_ContactId ON CampaignContacts(ContactId);

-- Campaign Logs (tracks individual email sends)
CREATE TABLE CampaignLogs (
    CampaignLogId INT IDENTITY(1,1) PRIMARY KEY,
    CampaignId INT NOT NULL,
    ContactId INT NOT NULL,
    Status NVARCHAR(50) DEFAULT 'queued', -- queued, sent, failed
    ErrorMessage NVARCHAR(MAX),
    Opened BIT DEFAULT 0,
    OpenedAt DATETIME2,
    Clicked BIT DEFAULT 0,
    ClickedAt DATETIME2,
    CreatedAt DATETIME2 DEFAULT GETDATE(),
    SentAt DATETIME2,
    FOREIGN KEY (CampaignId) REFERENCES Campaigns(CampaignId) ON DELETE CASCADE,
    FOREIGN KEY (ContactId) REFERENCES Contacts(ContactId)
);

CREATE INDEX IX_CampaignLogs_CampaignId ON CampaignLogs(CampaignId);
CREATE INDEX IX_CampaignLogs_ContactId ON CampaignLogs(ContactId);
CREATE INDEX IX_CampaignLogs_Status ON CampaignLogs(Status);

-- Audit Log table (for compliance)
CREATE TABLE AuditLogs (
    AuditLogId INT IDENTITY(1,1) PRIMARY KEY,
    UserId NVARCHAR(255) NOT NULL,
    Action NVARCHAR(100) NOT NULL, -- login, create_campaign, send_email, etc.
    EntityType NVARCHAR(100), -- contact, template, campaign
    EntityId INT,
    Details NVARCHAR(MAX), -- JSON details
    IPAddress NVARCHAR(50),
    CreatedAt DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (UserId) REFERENCES Users(UserId) ON DELETE CASCADE
);

CREATE INDEX IX_AuditLogs_UserId ON AuditLogs(UserId);
CREATE INDEX IX_AuditLogs_CreatedAt ON AuditLogs(CreatedAt);

-- Unsubscribe table (for GDPR/CCPA compliance)
CREATE TABLE Unsubscribes (
    UnsubscribeId INT IDENTITY(1,1) PRIMARY KEY,
    Email NVARCHAR(255) NOT NULL UNIQUE,
    Reason NVARCHAR(MAX),
    CreatedAt DATETIME2 DEFAULT GETDATE()
);

CREATE INDEX IX_Unsubscribes_Email ON Unsubscribes(Email);

-- Add RateClients table for Rate Calculator with full schema
CREATE TABLE RateClients (
    ClientId INT IDENTITY(1,1) PRIMARY KEY,
    UserId NVARCHAR(255) NOT NULL,
    Title NVARCHAR(255) NOT NULL,
    MSP NVARCHAR(255),
    Tool NVARCHAR(255),
    MSPFee DECIMAL(10,2),
    OtherDiscounts NVARCHAR(MAX),
    TotalDiscounts DECIMAL(10,2),
    MarkupW2 DECIMAL(10,2),
    MarkupC2C DECIMAL(10,2),
    C2CFriendly NVARCHAR(255),
    ConversionMaxLength NVARCHAR(255),
    StartingFee DECIMAL(10,2),
    OTRate NVARCHAR(255),
    Visible BIT DEFAULT 1,
    CreatedAt DATETIME2 DEFAULT GETDATE(),
    UpdatedAt DATETIME2,
    FOREIGN KEY (UserId) REFERENCES Users(UserId) ON DELETE CASCADE
);

CREATE INDEX IX_RateClients_UserId ON RateClients(UserId);
CREATE INDEX IX_RateClients_Title ON RateClients(Title);
CREATE INDEX IX_RateClients_Visible ON RateClients(Visible);

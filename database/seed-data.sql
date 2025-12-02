-- Sample data for testing BulkEmailTool

-- Insert a test user
INSERT INTO Users (UserId, Email, DisplayName, CreatedAt)
VALUES ('test-user-123', 'test@example.com', 'Test User', GETDATE());

-- Insert sample contacts
INSERT INTO Contacts (UserId, FirstName, LastName, Email, Company, JobTitle, Phone, Tags, CreatedAt)
VALUES 
('test-user-123', 'John', 'Doe', 'john.doe@example.com', 'Acme Corp', 'Sales Manager', '555-0101', 'prospect,pennsylvania', GETDATE()),
('test-user-123', 'Jane', 'Smith', 'jane.smith@example.com', 'Tech Solutions', 'CEO', '555-0102', 'customer,california', GETDATE()),
('test-user-123', 'Bob', 'Johnson', 'bob.johnson@example.com', 'Marketing Inc', 'Director', '555-0103', 'prospect,texas', GETDATE()),
('test-user-123', 'Alice', 'Williams', 'alice.williams@example.com', 'Consulting Group', 'Partner', '555-0104', 'customer,pennsylvania', GETDATE());

-- Insert sample template
INSERT INTO Templates (UserId, Name, Subject, Body, Description, Placeholders, CreatedAt)
VALUES 
('test-user-123', 'Welcome Email', 'Welcome {{FirstName}}!', 
'<html><body><p>Hi {{FirstName}},</p><p>Thank you for your interest in our services. As a {{JobTitle}} at {{Company}}, we believe you''ll find great value in what we offer.</p><p>Best regards,<br>The Team</p></body></html>', 
'Standard welcome email for new prospects', 
'["FirstName", "JobTitle", "Company"]', 
GETDATE());

-- Insert sample campaign
INSERT INTO Campaigns (UserId, Name, TemplateId, Status, CreatedAt)
VALUES 
('test-user-123', 'Q1 Outreach Campaign', 1, 'draft', GETDATE());

-- Link contacts to campaign
INSERT INTO CampaignContacts (CampaignId, ContactId)
VALUES 
(1, 1),
(1, 2),
(1, 3),
(1, 4);

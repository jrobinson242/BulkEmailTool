-- Sample data for testing BulkEmailTool

-- Insert a test user
INSERT INTO Users (UserId, Email, DisplayName, CreatedAt)
VALUES ('john-robinson-rsc', 'john.robinson@rsc.com', 'John Robinson', GETDATE());

-- Insert sample contacts
INSERT INTO Contacts (UserId, FirstName, LastName, Email, Company, JobTitle, Phone, Tags, CreatedAt)
VALUES 
('john-robinson-rsc', 'John', 'Doe', 'john.doe@example.com', 'Acme Corp', 'Sales Manager', '555-0101', 'prospect,pennsylvania', GETDATE()),
('john-robinson-rsc', 'Jane', 'Smith', 'jane.smith@example.com', 'Tech Solutions', 'CEO', '555-0102', 'customer,california', GETDATE()),
('john-robinson-rsc', 'Bob', 'Johnson', 'bob.johnson@example.com', 'Marketing Inc', 'Director', '555-0103', 'prospect,texas', GETDATE()),
('john-robinson-rsc', 'Alice', 'Williams', 'alice.williams@example.com', 'Consulting Group', 'Partner', '555-0104', 'customer,pennsylvania', GETDATE());

-- Insert sample template
INSERT INTO Templates (UserId, Name, Subject, Body, Description, Placeholders, CreatedAt)
VALUES 
('john-robinson-rsc', 'Welcome Email', 'Welcome {{FirstName}}!', 
'<html><body><p>Hi {{FirstName}},</p><p>Thank you for your interest in our services. As a {{JobTitle}} at {{Company}}, we believe you''ll find great value in what we offer.</p><p>Best regards,<br>The Team</p></body></html>', 
'Standard welcome email for new prospects', 
'["FirstName", "JobTitle", "Company"]', 
GETDATE());

-- Insert sample campaign
INSERT INTO Campaigns (UserId, Name, TemplateId, Status, CreatedAt)
VALUES 
('john-robinson-rsc', 'Q1 Outreach Campaign', 1, 'draft', GETDATE());

-- Link contacts to campaign
INSERT INTO CampaignContacts (CampaignId, ContactId, Status, CreatedAt)
SELECT 1, ContactId, 'pending', GETDATE()
FROM Contacts 
WHERE UserId = 'john-robinson-rsc';

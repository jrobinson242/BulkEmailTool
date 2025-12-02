const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticateToken } = require('../middleware/auth');
const { executeQuery, sql } = require('../config/database');
const GraphService = require('../services/graphService');
const logger = require('../utils/logger');

const upload = multer({ dest: 'uploads/' });

// Get all contacts for the authenticated user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const query = `
      SELECT * FROM Contacts 
      WHERE UserId = @userId 
      ORDER BY LastName, FirstName
    `;
    const result = await executeQuery(query, { userId: req.userId });
    res.json(result.recordset);
  } catch (error) {
    logger.error('Failed to fetch contacts', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// Sync contacts from Outlook
router.post('/sync', authenticateToken, async (req, res) => {
  try {
    const graphService = new GraphService(req.accessToken);
    const outlookContacts = await graphService.getContacts(1000);
    
    let synced = 0;
    
    for (const contact of outlookContacts) {
      const email = contact.emailAddresses?.[0]?.address;
      if (!email) continue;
      
      const query = `
        MERGE Contacts AS target
        USING (SELECT @userId AS UserId, @email AS Email) AS source
        ON (target.UserId = source.UserId AND target.Email = source.Email)
        WHEN MATCHED THEN
          UPDATE SET 
            FirstName = @firstName,
            LastName = @lastName,
            Company = @company,
            JobTitle = @jobTitle,
            Phone = @phone,
            UpdatedAt = GETDATE()
        WHEN NOT MATCHED THEN
          INSERT (UserId, FirstName, LastName, Email, Company, JobTitle, Phone, CreatedAt)
          VALUES (@userId, @firstName, @lastName, @email, @company, @jobTitle, @phone, GETDATE());
      `;
      
      await executeQuery(query, {
        userId: req.userId,
        firstName: contact.givenName || '',
        lastName: contact.surname || '',
        email: email,
        company: contact.companyName || '',
        jobTitle: contact.jobTitle || '',
        phone: contact.mobilePhone || contact.businessPhones?.[0] || ''
      });
      
      synced++;
    }
    
    logger.info(`Synced ${synced} contacts for user ${req.userId}`);
    res.json({ message: `Synced ${synced} contacts`, count: synced });
  } catch (error) {
    logger.error('Contact sync failed', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// Import contacts from CSV
router.post('/import', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    // CSV parsing logic would go here
    res.json({ message: 'CSV import functionality - implement with csv-parser library' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new contact
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { firstName, lastName, email, company, jobTitle, phone, tags } = req.body;
    
    const query = `
      INSERT INTO Contacts (UserId, FirstName, LastName, Email, Company, JobTitle, Phone, Tags, CreatedAt)
      OUTPUT INSERTED.*
      VALUES (@userId, @firstName, @lastName, @email, @company, @jobTitle, @phone, @tags, GETDATE())
    `;
    
    const result = await executeQuery(query, {
      userId: req.userId,
      firstName: firstName || '',
      lastName: lastName || '',
      email,
      company: company || '',
      jobTitle: jobTitle || '',
      phone: phone || '',
      tags: tags || ''
    });
    
    res.status(201).json(result.recordset[0]);
  } catch (error) {
    logger.error('Failed to create contact', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// Update contact
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { firstName, lastName, email, company, jobTitle, phone, tags } = req.body;
    
    const query = `
      UPDATE Contacts 
      SET FirstName = @firstName, LastName = @lastName, Email = @email,
          Company = @company, JobTitle = @jobTitle, Phone = @phone,
          Tags = @tags, UpdatedAt = GETDATE()
      OUTPUT INSERTED.*
      WHERE ContactId = @contactId AND UserId = @userId
    `;
    
    const result = await executeQuery(query, {
      contactId: req.params.id,
      userId: req.userId,
      firstName,
      lastName,
      email,
      company: company || '',
      jobTitle: jobTitle || '',
      phone: phone || '',
      tags: tags || ''
    });
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }
    
    res.json(result.recordset[0]);
  } catch (error) {
    logger.error('Failed to update contact', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// Delete contact
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const query = `
      DELETE FROM Contacts 
      WHERE ContactId = @contactId AND UserId = @userId
    `;
    
    await executeQuery(query, {
      contactId: req.params.id,
      userId: req.userId
    });
    
    res.json({ message: 'Contact deleted successfully' });
  } catch (error) {
    logger.error('Failed to delete contact', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

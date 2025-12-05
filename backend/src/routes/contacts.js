const express = require('express');
const router = express.Router();
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const { authenticateToken } = require('../middleware/auth');
const { executeQuery, sql } = require('../config/database');
const GraphService = require('../services/graphService');
const EWSService = require('../services/ewsService');
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

// Get available contact folders from Outlook
router.get('/folders', authenticateToken, async (req, res) => {
  try {
    logger.info(`Fetching contact folders for user ${req.userId}`);
    
    const graphService = new GraphService(req.accessToken, req.userEmail);
    const folders = await graphService.getContactFolders();
    
    // Get contact details for each folder
    const foldersWithContacts = await Promise.all(
      folders.map(async (folder) => {
        try {
          const contacts = await graphService.getContactsFromFolder(folder.id);
          return {
            id: folder.id,
            displayName: folder.displayName,
            parentFolderId: folder.parentFolderId,
            contactCount: contacts.length,
            type: 'folder',
            contacts: contacts.map(c => ({
              displayName: c.displayName,
              email: c.emailAddresses?.[0]?.address || '',
              givenName: c.givenName,
              surname: c.surname
            }))
          };
        } catch (error) {
          logger.error(`Failed to get contacts for folder ${folder.displayName}`, { error: error.message });
          return {
            id: folder.id,
            displayName: folder.displayName,
            parentFolderId: folder.parentFolderId,
            contactCount: 0,
            type: 'folder',
            contacts: []
          };
        }
      })
    );
    
    // Also add default "My Contacts" option
    const defaultContacts = await graphService.getContacts(1000);
    foldersWithContacts.unshift({
      id: 'default',
      displayName: 'My Contacts (Default)',
      parentFolderId: null,
      contactCount: defaultContacts.length,
      type: 'folder',
      contacts: defaultContacts.map(c => ({
        displayName: c.displayName,
        email: c.emailAddresses?.[0]?.address || '',
        givenName: c.givenName,
        surname: c.surname
      }))
    });
    
    // Try to get contact groups via EWS (distribution lists)
    try {
      logger.info('Attempting to fetch contact groups via EWS');
      const ewsService = new EWSService(req.userEmail, req.accessToken);
      const contactGroups = await ewsService.getContactGroups();
      
      // Add contact groups to the list
      for (const group of contactGroups) {
        foldersWithContacts.push({
          id: `distlist-${group.id}`,
          displayName: `${group.displayName} (Distribution List)`,
          parentFolderId: null,
          contactCount: group.memberCount,
          type: 'distribution-list',
          contacts: group.members.map(m => ({
            displayName: m.name,
            email: m.email,
            givenName: '',
            surname: ''
          }))
        });
      }
      
      logger.info(`Added ${contactGroups.length} distribution lists`);
    } catch (ewsError) {
      logger.error('Failed to fetch contact groups via EWS', { error: ewsError.message });
      // Continue without distribution lists if EWS fails
    }
    
    logger.info(`Found ${foldersWithContacts.length} contact sources total`);
    res.json(foldersWithContacts);
  } catch (error) {
    logger.error('Failed to fetch contact folders', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// Sync contacts from Outlook (from selected folders, individual contacts, or all)
router.post('/sync', authenticateToken, async (req, res) => {
  try {
    logger.info(`Starting contact sync for user ${req.userId}`);
    
    const graphService = new GraphService(req.accessToken);
    const { folderIds, contacts: individualContacts } = req.body;
    
    let outlookContacts = [];
    
    // If individual contacts are provided, sync only those
    if (individualContacts && individualContacts.length > 0) {
      logger.info(`Syncing ${individualContacts.length} individually selected contacts...`);
      
      // Map the frontend contact format to the backend format
      outlookContacts = individualContacts.map(contact => ({
        givenName: contact.givenName || '',
        surname: contact.surname || '',
        displayName: contact.displayName || `${contact.givenName} ${contact.surname}`.trim(),
        emailAddresses: [{ address: contact.email }],
        companyName: contact.company || '',
        jobTitle: contact.jobTitle || '',
        businessPhones: contact.phone ? [contact.phone] : [],
        folderName: 'Selected Contacts',
        folderId: contact.folderId
      }));
    } else if (folderIds && folderIds.length > 0) {
      // Sync from selected folders only
      logger.info(`Fetching contacts from ${folderIds.length} selected folders...`);
      
      for (const folderId of folderIds) {
        try {
          let contacts;
          if (folderId === 'default') {
            contacts = await graphService.getContacts(1000);
            contacts = contacts.map(c => ({ ...c, folderName: 'My Contacts', folderId: 'default' }));
          } else {
            contacts = await graphService.getContactsFromFolder(folderId);
            // Get folder name
            const folders = await graphService.getContactFolders();
            const folder = folders.find(f => f.id === folderId);
            contacts = contacts.map(c => ({ 
              ...c, 
              folderName: folder?.displayName || 'Unknown', 
              folderId 
            }));
          }
          outlookContacts.push(...contacts);
        } catch (folderError) {
          logger.error(`Failed to sync folder ${folderId}`, { error: folderError.message });
        }
      }
    } else {
      // Sync all folders
      logger.info('Fetching contacts from all folders...');
      outlookContacts = await graphService.getAllContactsFromFolders();
    }
    
    logger.info(`Retrieved ${outlookContacts.length} contacts from Outlook`);
    
    let synced = 0;
    let skipped = 0;
    
    for (const contact of outlookContacts) {
      const email = contact.emailAddresses?.[0]?.address;
      if (!email) {
        skipped++;
        continue;
      }
      
      // Use folder name as a tag
      const tags = contact.folderName || '';
      
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
            Tags = @tags,
            UpdatedAt = GETDATE()
        WHEN NOT MATCHED THEN
          INSERT (UserId, FirstName, LastName, Email, Company, JobTitle, Phone, Tags, CreatedAt)
          VALUES (@userId, @firstName, @lastName, @email, @company, @jobTitle, @phone, @tags, GETDATE());
      `;
      
      await executeQuery(query, {
        userId: req.userId,
        firstName: contact.givenName || '',
        lastName: contact.surname || '',
        email: email,
        company: contact.companyName || '',
        jobTitle: contact.jobTitle || '',
        phone: contact.mobilePhone || contact.businessPhones?.[0] || '',
        tags: tags
      });
      
      synced++;
    }
    
    logger.info(`Synced ${synced} contacts (skipped ${skipped} without email) for user ${req.userId}`);
    res.json({ 
      message: `Synced ${synced} contacts from Outlook folders`, 
      count: synced,
      skipped: skipped
    });
  } catch (error) {
    logger.error('Contact sync failed', { error: error.message, stack: error.stack });
    res.status(500).json({ error: error.message, details: error.stack });
  }
});

// Preview contacts from CSV before importing
router.post('/import/preview', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const contacts = [];
    const errors = [];
    let lineNumber = 1;

    // Parse CSV file
    await new Promise((resolve, reject) => {
      fs.createReadStream(req.file.path)
        .pipe(csv())
        .on('data', (row) => {
          lineNumber++;
          
          // Check for email (required field)
          const email = row.email || row.Email || row.EMAIL || row['E-mail'] || row['E-mail Address'];
          
          if (!email || !email.trim()) {
            errors.push(`Line ${lineNumber}: Missing email address`);
            return;
          }

          // Validate email format
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(email.trim())) {
            errors.push(`Line ${lineNumber}: Invalid email format: ${email}`);
            return;
          }

          // Extract contact information
          contacts.push({
            firstName: row.firstName || row.FirstName || row.first_name || row['First Name'] || '',
            lastName: row.lastName || row.LastName || row.last_name || row['Last Name'] || '',
            email: email.trim(),
            company: row.company || row.Company || row.organization || row.Organization || '',
            jobTitle: row.jobTitle || row.JobTitle || row.job_title || row['Job Title'] || row.title || row.Title || '',
            phone: row.phone || row.Phone || row.mobile || row.Mobile || row['Phone Number'] || '',
            tags: row.tags || row.Tags || row.category || row.Category || 'CSV Import'
          });
        })
        .on('end', resolve)
        .on('error', reject);
    });

    // Delete uploaded file
    fs.unlinkSync(req.file.path);

    if (contacts.length === 0) {
      return res.status(400).json({ 
        error: 'No valid contacts found in CSV file', 
        errors: errors 
      });
    }

    // Check which contacts already exist
    const existingEmails = [];
    const newContacts = [];
    
    for (const contact of contacts) {
      const checkQuery = `
        SELECT ContactId, Email FROM Contacts 
        WHERE UserId = @userId AND Email = @email
      `;
      const result = await executeQuery(checkQuery, {
        userId: req.userId,
        email: contact.email
      });
      
      if (result.recordset.length > 0) {
        existingEmails.push(contact.email);
      } else {
        newContacts.push(contact);
      }
    }

    res.json({
      totalParsed: contacts.length,
      newContacts,
      existingCount: existingEmails.length,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    logger.error('CSV preview failed', { error: error.message });
    
    // Clean up uploaded file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ error: error.message });
  }
});

// Import contacts from CSV
router.post('/import', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const contacts = [];
    const errors = [];
    let lineNumber = 1;

    // Parse CSV file
    await new Promise((resolve, reject) => {
      fs.createReadStream(req.file.path)
        .pipe(csv())
        .on('data', (row) => {
          lineNumber++;
          
          // Log the first row to help debug
          if (lineNumber === 2) {
            logger.info('First CSV row columns:', { columns: Object.keys(row) });
          }
          
          // Check for email (required field)
          const email = row.email || row.Email || row.EMAIL || row['E-mail'] || row['E-mail Address'];
          
          if (!email || !email.trim()) {
            errors.push(`Line ${lineNumber}: Missing email address`);
            return;
          }

          // Validate email format
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(email.trim())) {
            errors.push(`Line ${lineNumber}: Invalid email format: ${email}`);
            return;
          }

          // Extract contact information with flexible column names
          contacts.push({
            firstName: row.firstName || row.FirstName || row.first_name || row['First Name'] || '',
            lastName: row.lastName || row.LastName || row.last_name || row['Last Name'] || '',
            email: email.trim(),
            company: row.company || row.Company || row.organization || row.Organization || '',
            jobTitle: row.jobTitle || row.JobTitle || row.job_title || row['Job Title'] || row.title || row.Title || '',
            phone: row.phone || row.Phone || row.mobile || row.Mobile || row['Phone Number'] || '',
            tags: row.tags || row.Tags || row.category || row.Category || 'CSV Import'
          });
        })
        .on('end', resolve)
        .on('error', reject);
    });

    // Delete uploaded file
    fs.unlinkSync(req.file.path);

    if (contacts.length === 0) {
      return res.status(400).json({ 
        error: 'No valid contacts found in CSV file', 
        errors: errors 
      });
    }

    // Insert contacts into database using MERGE to handle duplicates
    let imported = 0;
    let skipped = 0;
    const contactIds = [];

    for (const contact of contacts) {
      try {
        const query = `
          MERGE INTO Contacts AS target
          USING (SELECT @userId AS UserId, @email AS Email) AS source
          ON (target.UserId = source.UserId AND target.Email = source.Email)
          WHEN MATCHED THEN
            UPDATE SET 
              FirstName = @firstName,
              LastName = @lastName,
              Company = @company,
              JobTitle = @jobTitle,
              Phone = @phone,
              Tags = @tags,
              UpdatedAt = GETDATE()
          WHEN NOT MATCHED THEN
            INSERT (UserId, FirstName, LastName, Email, Company, JobTitle, Phone, Tags, CreatedAt)
            VALUES (@userId, @firstName, @lastName, @email, @company, @jobTitle, @phone, @tags, GETDATE())
          OUTPUT INSERTED.ContactId;
        `;
        
        const result = await executeQuery(query, {
          userId: req.userId,
          firstName: contact.firstName,
          lastName: contact.lastName,
          email: contact.email,
          company: contact.company,
          jobTitle: contact.jobTitle,
          phone: contact.phone,
          tags: contact.tags
        });
        
        // Collect ContactId from result
        if (result.recordset && result.recordset[0]) {
          contactIds.push(result.recordset[0].ContactId);
        }
        
        imported++;
      } catch (err) {
        logger.error('Failed to import contact', { email: contact.email, error: err.message });
        errors.push(`Failed to import ${contact.email}: ${err.message}`);
        skipped++;
      }
    }

    logger.info(`Imported ${imported} contacts from CSV for user ${req.userId}`);
    res.json({ 
      message: `Successfully imported ${imported} contacts`, 
      imported,
      skipped,
      contactIds,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    logger.error('CSV import failed', { error: error.message });
    
    // Clean up uploaded file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ error: error.message });
  }
});

// Import contacts from JSON data (after preview confirmation)
router.post('/import/confirm', authenticateToken, async (req, res) => {
  try {
    const { contacts } = req.body;
    
    if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
      return res.status(400).json({ error: 'No contacts provided' });
    }

    // Insert contacts into database
    let imported = 0;
    let skipped = 0;
    const contactIds = [];
    const errors = [];

    for (const contact of contacts) {
      try {
        const query = `
          INSERT INTO Contacts (UserId, FirstName, LastName, Email, Company, JobTitle, Phone, Tags, CreatedAt)
          OUTPUT INSERTED.ContactId
          VALUES (@userId, @firstName, @lastName, @email, @company, @jobTitle, @phone, @tags, GETDATE())
        `;
        
        const result = await executeQuery(query, {
          userId: req.userId,
          firstName: contact.firstName || '',
          lastName: contact.lastName || '',
          email: contact.email,
          company: contact.company || '',
          jobTitle: contact.jobTitle || '',
          phone: contact.phone || '',
          tags: contact.tags || 'CSV Import'
        });
        
        if (result.recordset && result.recordset[0]) {
          contactIds.push(result.recordset[0].ContactId);
        }
        
        imported++;
      } catch (err) {
        logger.error('Failed to import contact', { email: contact.email, error: err.message });
        errors.push(`Failed to import ${contact.email}: ${err.message}`);
        skipped++;
      }
    }

    logger.info(`Imported ${imported} contacts for user ${req.userId}`);
    res.json({ 
      message: `Successfully imported ${imported} contacts`, 
      imported,
      skipped,
      contactIds,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    logger.error('CSV import confirmation failed', { error: error.message });
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
    const contactId = parseInt(req.params.id);
    
    logger.info(`Deleting contact ${contactId} for user ${req.userId}`);
    
    // First delete from CampaignContacts
    const deleteCampaignContactsQuery = `
      DELETE FROM CampaignContacts
      WHERE ContactId = @contactId
    `;
    
    await executeQuery(deleteCampaignContactsQuery, { contactId });
    
    // Then delete the contact
    const query = `
      DELETE FROM Contacts 
      OUTPUT DELETED.ContactId
      WHERE ContactId = @contactId AND UserId = @userId
    `;
    
    const result = await executeQuery(query, {
      contactId: contactId,
      userId: req.userId
    });
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }
    
    logger.info(`Contact ${contactId} deleted successfully`);
    res.json({ message: 'Contact deleted successfully' });
  } catch (error) {
    logger.error('Failed to delete contact', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// Bulk delete all contacts
router.delete('/', authenticateToken, async (req, res) => {
  try {
    logger.info(`Bulk deleting all contacts for user ${req.userId}`);
    
    // First delete from CampaignContacts for this user's contacts
    const deleteCampaignContactsQuery = `
      DELETE FROM CampaignContacts
      WHERE ContactId IN (
        SELECT ContactId FROM Contacts WHERE UserId = @userId
      )
    `;
    
    await executeQuery(deleteCampaignContactsQuery, { userId: req.userId });
    
    // Then delete all contacts
    const query = `
      DELETE FROM Contacts 
      WHERE UserId = @userId
    `;
    
    const result = await executeQuery(query, {
      userId: req.userId
    });
    
    logger.info(`Bulk deleted contacts for user ${req.userId}, rows affected: ${result.rowsAffected[0]}`);
    res.json({ 
      message: 'All contacts deleted successfully',
      count: result.rowsAffected[0]
    });
  } catch (error) {
    logger.error('Failed to bulk delete contacts', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

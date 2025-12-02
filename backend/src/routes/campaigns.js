const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { executeQuery } = require('../config/database');
const GraphService = require('../services/graphService');
const TemplateService = require('../services/templateService');
const queueService = require('../services/queueService');
const logger = require('../utils/logger');

// Get all campaigns
router.get('/', authenticateToken, async (req, res) => {
  try {
    const query = `
      SELECT c.*, t.Name as TemplateName, t.Subject,
             COUNT(cl.CampaignLogId) as TotalSent,
             SUM(CASE WHEN cl.Status = 'sent' THEN 1 ELSE 0 END) as SuccessCount
      FROM Campaigns c
      LEFT JOIN Templates t ON c.TemplateId = t.TemplateId
      LEFT JOIN CampaignLogs cl ON c.CampaignId = cl.CampaignId
      WHERE c.UserId = @userId
      GROUP BY c.CampaignId, c.Name, c.Status, c.ScheduledAt, c.CreatedAt, 
               c.UserId, c.TemplateId, t.Name, t.Subject
      ORDER BY c.CreatedAt DESC
    `;
    const result = await executeQuery(query, { userId: req.userId });
    res.json(result.recordset);
  } catch (error) {
    logger.error('Failed to fetch campaigns', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// Get single campaign with details
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const query = `
      SELECT c.*, t.Name as TemplateName, t.Subject, t.Body
      FROM Campaigns c
      LEFT JOIN Templates t ON c.TemplateId = t.TemplateId
      WHERE c.CampaignId = @campaignId AND c.UserId = @userId
    `;
    const result = await executeQuery(query, {
      campaignId: req.params.id,
      userId: req.userId
    });
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    
    res.json(result.recordset[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create campaign
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, templateId, contactIds, scheduledAt } = req.body;
    
    // Validate template exists
    const templateQuery = `
      SELECT * FROM Templates WHERE TemplateId = @templateId AND UserId = @userId
    `;
    const templateResult = await executeQuery(templateQuery, {
      templateId,
      userId: req.userId
    });
    
    if (templateResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    // Create campaign
    const campaignQuery = `
      INSERT INTO Campaigns (UserId, Name, TemplateId, Status, ScheduledAt, CreatedAt)
      OUTPUT INSERTED.*
      VALUES (@userId, @name, @templateId, 'draft', @scheduledAt, GETDATE())
    `;
    
    const campaignResult = await executeQuery(campaignQuery, {
      userId: req.userId,
      name,
      templateId,
      scheduledAt: scheduledAt || null
    });
    
    const campaign = campaignResult.recordset[0];
    
    // Add contacts to campaign
    if (contactIds && contactIds.length > 0) {
      const contactsQuery = `
        INSERT INTO CampaignContacts (CampaignId, ContactId)
        VALUES ${contactIds.map((_, i) => `(@campaignId, @contactId${i})`).join(', ')}
      `;
      
      const params = { campaignId: campaign.CampaignId };
      contactIds.forEach((id, i) => {
        params[`contactId${i}`] = id;
      });
      
      await executeQuery(contactsQuery, params);
    }
    
    logger.info(`Campaign created: ${campaign.CampaignId}`);
    res.status(201).json(campaign);
  } catch (error) {
    logger.error('Failed to create campaign', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// Send campaign
router.post('/:id/send', authenticateToken, async (req, res) => {
  try {
    const campaignId = req.params.id;
    
    // Get campaign details
    const campaignQuery = `
      SELECT c.*, t.Subject, t.Body
      FROM Campaigns c
      JOIN Templates t ON c.TemplateId = t.TemplateId
      WHERE c.CampaignId = @campaignId AND c.UserId = @userId
    `;
    const campaignResult = await executeQuery(campaignQuery, {
      campaignId,
      userId: req.userId
    });
    
    if (campaignResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    
    const campaign = campaignResult.recordset[0];
    
    // Get contacts for campaign
    const contactsQuery = `
      SELECT con.* FROM Contacts con
      JOIN CampaignContacts cc ON con.ContactId = cc.ContactId
      WHERE cc.CampaignId = @campaignId
    `;
    const contactsResult = await executeQuery(contactsQuery, { campaignId });
    const contacts = contactsResult.recordset;
    
    if (contacts.length === 0) {
      return res.status(400).json({ error: 'No contacts in campaign' });
    }
    
    // Update campaign status
    await executeQuery(
      `UPDATE Campaigns SET Status = 'sending' WHERE CampaignId = @campaignId`,
      { campaignId }
    );
    
    // Queue emails for sending
    for (const contact of contacts) {
      const contactData = {
        FirstName: contact.FirstName,
        LastName: contact.LastName,
        Email: contact.Email,
        Company: contact.Company,
        JobTitle: contact.JobTitle
      };
      
      const subject = TemplateService.renderTemplate(campaign.Subject, contactData);
      let body = TemplateService.renderTemplate(campaign.Body, contactData);
      
      // Add tracking
      const trackingId = `${campaignId}-${contact.ContactId}-${Date.now()}`;
      body = TemplateService.addTrackingPixel(body, trackingId);
      body = TemplateService.addLinkTracking(body, campaignId, contact.ContactId);
      
      await queueService.addEmailToQueue({
        campaignId,
        contactId: contact.ContactId,
        recipient: contact.Email,
        subject,
        body,
        trackingId
      });
      
      // Log the queued email
      await executeQuery(`
        INSERT INTO CampaignLogs (CampaignId, ContactId, Status, CreatedAt)
        VALUES (@campaignId, @contactId, 'queued', GETDATE())
      `, {
        campaignId,
        contactId: contact.ContactId
      });
    }
    
    logger.info(`Campaign ${campaignId} queued with ${contacts.length} emails`);
    res.json({ 
      message: 'Campaign queued for sending', 
      contactCount: contacts.length 
    });
  } catch (error) {
    logger.error('Failed to send campaign', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// Get campaign logs
router.get('/:id/logs', authenticateToken, async (req, res) => {
  try {
    const query = `
      SELECT cl.*, c.FirstName, c.LastName, c.Email
      FROM CampaignLogs cl
      JOIN Contacts c ON cl.ContactId = c.ContactId
      JOIN Campaigns cam ON cl.CampaignId = cam.CampaignId
      WHERE cl.CampaignId = @campaignId AND cam.UserId = @userId
      ORDER BY cl.CreatedAt DESC
    `;
    
    const result = await executeQuery(query, {
      campaignId: req.params.id,
      userId: req.userId
    });
    
    res.json(result.recordset);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete campaign
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const query = `
      DELETE FROM Campaigns 
      WHERE CampaignId = @campaignId AND UserId = @userId
    `;
    
    await executeQuery(query, {
      campaignId: req.params.id,
      userId: req.userId
    });
    
    res.json({ message: 'Campaign deleted successfully' });
  } catch (error) {
    logger.error('Failed to delete campaign', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

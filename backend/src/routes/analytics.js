const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { executeQuery } = require('../config/database');
const logger = require('../utils/logger');

// Get analytics for a specific campaign
router.get('/campaign/:id', authenticateToken, async (req, res) => {
  try {
    const query = `
      SELECT 
        COUNT(*) as TotalSent,
        SUM(CASE WHEN cl.Status = 'sent' THEN 1 ELSE 0 END) as SuccessCount,
        SUM(CASE WHEN cl.Status = 'failed' THEN 1 ELSE 0 END) as FailedCount,
        SUM(CASE WHEN cl.Opened = 1 THEN 1 ELSE 0 END) as OpenedCount,
        SUM(CASE WHEN cl.Clicked = 1 THEN 1 ELSE 0 END) as ClickedCount
      FROM CampaignLogs cl
      JOIN Campaigns c ON cl.CampaignId = c.CampaignId
      WHERE cl.CampaignId = @campaignId AND c.UserId = @userId
    `;
    
    const result = await executeQuery(query, {
      campaignId: req.params.id,
      userId: req.userId
    });
    
    const stats = result.recordset[0];
    
    res.json({
      totalSent: stats.TotalSent || 0,
      successCount: stats.SuccessCount || 0,
      failedCount: stats.FailedCount || 0,
      openedCount: stats.OpenedCount || 0,
      clickedCount: stats.ClickedCount || 0,
      openRate: stats.SuccessCount > 0 
        ? ((stats.OpenedCount / stats.SuccessCount) * 100).toFixed(2) 
        : 0,
      clickRate: stats.SuccessCount > 0 
        ? ((stats.ClickedCount / stats.SuccessCount) * 100).toFixed(2) 
        : 0
    });
  } catch (error) {
    logger.error('Failed to fetch campaign analytics', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// Track email open (pixel tracking)
router.get('/track/:trackingId', async (req, res) => {
  try {
    const trackingId = req.params.trackingId;
    logger.info(`Tracking pixel accessed: ${trackingId}`);
    
    const parts = trackingId.split('-');
    
    if (parts.length >= 2) {
      const campaignId = parts[0];
      const contactId = parts[1];
      
      logger.info(`Updating open status for campaign ${campaignId}, contact ${contactId}`);
      
      // Update opened status
      const result = await executeQuery(`
        UPDATE CampaignLogs 
        SET Opened = 1, OpenedAt = GETDATE()
        WHERE CampaignId = @campaignId AND ContactId = @contactId AND Opened = 0
      `, {
        campaignId,
        contactId
      });
      
      logger.info(`Email opened: ${trackingId}, rows affected: ${result.rowsAffected[0]}`);
    } else {
      logger.warn(`Invalid tracking ID format: ${trackingId}`);
    }
    
    // Return 1x1 transparent pixel
    const pixel = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );
    
    res.writeHead(200, {
      'Content-Type': 'image/png',
      'Content-Length': pixel.length
    });
    res.end(pixel);
  } catch (error) {
    logger.error('Tracking pixel error', { error: error.message });
    res.status(500).end();
  }
});

// Track link click
router.post('/click', async (req, res) => {
  try {
    const { campaignId, contactId } = req.body;
    
    await executeQuery(`
      UPDATE CampaignLogs 
      SET Clicked = 1, ClickedAt = GETDATE()
      WHERE CampaignId = @campaignId AND ContactId = @contactId
    `, {
      campaignId,
      contactId
    });
    
    logger.info(`Link clicked: Campaign ${campaignId}, Contact ${contactId}`);
    res.json({ success: true });
  } catch (error) {
    logger.error('Click tracking error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// Get overall dashboard statistics
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const query = `
      SELECT 
        COUNT(DISTINCT c.CampaignId) as TotalCampaigns,
        COUNT(DISTINCT con.ContactId) as TotalContacts,
        COUNT(DISTINCT CASE WHEN cl.Status = 'sent' THEN CAST(cl.CampaignId AS VARCHAR) + '-' + CAST(cl.ContactId AS VARCHAR) END) as TotalEmailsSent,
        COUNT(DISTINCT CASE WHEN cl.Opened = 1 THEN CAST(cl.CampaignId AS VARCHAR) + '-' + CAST(cl.ContactId AS VARCHAR) END) as TotalOpened,
        COUNT(DISTINCT CASE WHEN cl.Clicked = 1 THEN CAST(cl.CampaignId AS VARCHAR) + '-' + CAST(cl.ContactId AS VARCHAR) END) as TotalClicked,
        COUNT(DISTINCT CASE WHEN cl.Status = 'queued' THEN CAST(cl.CampaignId AS VARCHAR) + '-' + CAST(cl.ContactId AS VARCHAR) END) as TotalQueued,
        COUNT(DISTINCT CASE WHEN cl.Status = 'failed' THEN CAST(cl.CampaignId AS VARCHAR) + '-' + CAST(cl.ContactId AS VARCHAR) END) as TotalFailed
      FROM Campaigns c
      LEFT JOIN CampaignLogs cl ON c.CampaignId = cl.CampaignId
      LEFT JOIN Contacts con ON c.UserId = con.UserId
      WHERE c.UserId = @userId
    `;
    
    const result = await executeQuery(query, { userId: req.userId });
    const stats = result.recordset[0];
    
    res.json({
      totalCampaigns: stats.TotalCampaigns || 0,
      totalContacts: stats.TotalContacts || 0,
      totalEmailsSent: stats.TotalEmailsSent || 0,
      totalOpened: stats.TotalOpened || 0,
      totalClicked: stats.TotalClicked || 0,
      totalQueued: stats.TotalQueued || 0,
      totalFailed: stats.TotalFailed || 0,
      overallOpenRate: stats.TotalEmailsSent > 0 
        ? ((stats.TotalOpened / stats.TotalEmailsSent) * 100).toFixed(2) 
        : 0,
      overallClickRate: stats.TotalEmailsSent > 0 
        ? ((stats.TotalClicked / stats.TotalEmailsSent) * 100).toFixed(2) 
        : 0
    });
  } catch (error) {
    logger.error('Failed to fetch dashboard analytics', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

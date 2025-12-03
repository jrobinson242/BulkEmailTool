const express = require('express');
const router = express.Router();
const queueService = require('../services/queueService');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');
const sql = require('mssql');
const dbConfig = require('../config/database');

// Clear all messages from the queue (admin operation)
router.delete('/clear', authenticateToken, async (req, res) => {
  try {
    logger.info('Clearing email queue and failed logs', { userId: req.userId });
    
    // Clear Azure Storage Queue
    await queueService.clearQueue();
    
    // Clear failed campaign logs from database
    const pool = await sql.connect(dbConfig);
    const result = await pool.request()
      .input('userId', sql.NVarChar, req.userId)
      .query(`
        DELETE cl
        FROM CampaignLogs cl
        INNER JOIN Campaigns c ON cl.CampaignId = c.CampaignId
        WHERE c.UserId = @userId 
        AND cl.Status IN ('queued', 'failed')
      `);
    
    logger.info(`Cleared ${result.rowsAffected[0]} failed/queued logs from database`);
    
    res.json({ 
      message: 'Queue and failed logs cleared successfully',
      logsCleared: result.rowsAffected[0]
    });
  } catch (error) {
    logger.error('Failed to clear queue', { error: error.message });
    res.status(500).json({ error: 'Failed to clear queue' });
  }
});

module.exports = router;

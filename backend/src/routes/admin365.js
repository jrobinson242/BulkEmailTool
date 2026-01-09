const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const { getPool } = require('../config/database');
const GraphService = require('../services/graphService');

// Search Azure AD users (admin only)
router.get('/search365', authenticateToken, requireRole(['admin']), async (req, res) => {
  const logger = require('../utils/logger');
  try {
    const { q } = req.query;
    logger.info('[search365] Called', { query: q, userId: req.userId, userEmail: req.userEmail });
    if (!q || q.length < 2) {
      logger.info('[search365] Query too short', { query: q });
      return res.json([]);
    }
    if (!req.accessToken) {
      logger.error('[search365] No access token');
      return res.status(401).json({ error: 'No access token' });
    }
    logger.info('[search365] Using access token', { tokenStart: req.accessToken.substring(0, 12) + '...' });
    const graphService = new GraphService(req.accessToken);
    let results = [];
    try {
      results = await graphService.searchUsers(q);
      logger.info('[search365] Graph results', { count: results.length });
    } catch (gerr) {
      logger.error('[search365] GraphService.searchUsers error', { error: gerr.message, stack: gerr.stack });
      return res.status(500).json({ error: 'Graph API error: ' + gerr.message });
    }
    // Return only relevant fields
    res.json(results.map(u => ({
      id: u.id,
      displayName: u.displayName,
      mail: u.mail,
      userPrincipalName: u.userPrincipalName
    })));
  } catch (error) {
    logger.error('[search365] Handler error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: error.message });
  }
});

// Add user to local DB and set role (admin only)
router.post('/add365user', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { id, mail, displayName, role } = req.body;
    if (!id || !mail || !displayName || !role) return res.status(400).json({ error: 'Missing fields' });
    const pool = await getPool();
    // Check if user exists
    const check = await pool.request().input('userId', id).query('SELECT UserId FROM Users WHERE UserId = @userId');
    if (check.recordset.length) {
      await pool.request().input('userId', id).input('role', role).query('UPDATE Users SET Role = @role WHERE UserId = @userId');
      return res.json({ updated: true });
    }
    await pool.request()
      .input('userId', id)
      .input('email', mail)
      .input('displayName', displayName)
      .input('role', role)
      .query('INSERT INTO Users (UserId, Email, DisplayName, Role, CreatedAt) VALUES (@userId, @email, @displayName, @role, GETDATE())');
    res.json({ created: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

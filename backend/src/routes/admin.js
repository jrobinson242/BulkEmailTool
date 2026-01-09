const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const { getPool } = require('../config/database');

// Get all users (admin only)
router.get('/users', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query('SELECT UserId, Email, DisplayName, Role FROM Users');
    res.json(result.recordset);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update user role (admin only, cannot demote self if superuser)
router.put('/users/:userId/role', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;
    if (!role) return res.status(400).json({ error: 'Role is required' });
    // Prevent demoting superuser
    const pool = await getPool();
    const userResult = await pool.request().input('userId', userId).query('SELECT Email, Role FROM Users WHERE UserId = @userId');
    if (!userResult.recordset.length) return res.status(404).json({ error: 'User not found' });
    const { Email, Role } = userResult.recordset[0];
    if (Role === 'superuser' || (Email && Email.toLowerCase() === 'john.robinson@rsc.com')) {
      return res.status(403).json({ error: 'Cannot change role of superuser' });
    }
    await pool.request().input('userId', userId).input('role', role).query('UPDATE Users SET Role = @role WHERE UserId = @userId');
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

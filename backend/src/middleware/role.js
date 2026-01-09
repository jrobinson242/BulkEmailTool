// Middleware to require a specific role or superuser
const { getPool } = require('../config/database');


function requireRole(roles = []) {
  return async function (req, res, next) {
    try {
      const pool = await getPool();
      const result = await pool.request()
        .input('userId', req.userId)
        .query('SELECT Role, Email FROM Users WHERE UserId = @userId');
      if (!result.recordset.length) {
        return res.status(403).json({ error: 'User not found' });
      }
      const { Role, Email } = result.recordset[0];
      // Always allow superuser or john.robinson@rsc.com
      if (Role === 'superuser' || (Email && Email.toLowerCase() === 'john.robinson@rsc.com')) {
        return next();
      }
      if (!roles.includes(Role)) {
        return res.status(403).json({ error: 'Insufficient privileges' });
      }
      next();
    } catch (error) {
      return res.status(500).json({ error: 'Failed to check user role' });
    }
  };
}

module.exports = { requireRole };

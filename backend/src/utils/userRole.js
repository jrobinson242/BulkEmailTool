// Utility to get user role from DB
const { getPool } = require('../config/database');

async function getUserRole(userId) {
  const pool = await getPool();
  const result = await pool.request()
    .input('userId', userId)
    .query('SELECT Role FROM Users WHERE UserId = @userId');
  if (!result.recordset.length) return null;
  return result.recordset[0].Role;
}

module.exports = { getUserRole };

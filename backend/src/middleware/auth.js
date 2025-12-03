const logger = require('../utils/logger');
const { getPool } = require('../config/database');

// Decode JWT token (basic base64 decode - not validating signature for simplicity)
function decodeToken(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid token format');
    }
    // Handle base64url encoding (replace - with + and _ with /)
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    // Add padding if needed
    const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
    const payload = JSON.parse(Buffer.from(padded, 'base64').toString());
    return payload;
  } catch (error) {
    logger.error('Failed to decode token', { error: error.message, token: token.substring(0, 50) + '...' });
    return null;
  }
}

// Ensure user exists in database
async function ensureUserExists(userId, email, displayName) {
  try {
    const pool = await getPool();
    
    // Check if user exists
    const checkResult = await pool.request()
      .input('userId', userId)
      .query('SELECT UserId FROM Users WHERE UserId = @userId');
    
    if (checkResult.recordset.length === 0) {
      // Create new user
      await pool.request()
        .input('userId', userId)
        .input('email', email)
        .input('displayName', displayName)
        .query('INSERT INTO Users (UserId, Email, DisplayName, CreatedAt) VALUES (@userId, @email, @displayName, GETDATE())');
      
      logger.info('New user created', { userId, email });
    }
  } catch (error) {
    logger.error('Failed to ensure user exists', { error: error.message });
    throw error;
  }
}

async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  // Store the access token for use in Graph API calls
  req.accessToken = token;
  
  // Decode token to get user info
  const payload = decodeToken(token);
  if (!payload) {
    logger.error('Token decode failed');
    return res.status(401).json({ error: 'Invalid token format' });
  }
  
  // Extract user information from token
  // Azure AD tokens include 'oid' (object ID) as the unique user identifier
  req.userId = payload.oid || payload.sub;
  req.userEmail = payload.email || payload.preferred_username || payload.upn;
  req.userName = payload.name;
  
  logger.info('Token decoded', { 
    userId: req.userId, 
    email: req.userEmail, 
    name: req.userName,
    hasOid: !!payload.oid,
    hasSub: !!payload.sub,
    hasEmail: !!payload.email,
    hasPreferredUsername: !!payload.preferred_username,
    hasUpn: !!payload.upn
  });
  
  if (!req.userId) {
    logger.error('No user ID found in token', { payload: Object.keys(payload) });
    return res.status(401).json({ error: 'Invalid token: missing user identifier' });
  }
  
  // Ensure user exists in database
  try {
    await ensureUserExists(req.userId, req.userEmail, req.userName);
  } catch (error) {
    logger.error('Failed to ensure user exists', { error: error.message, userId: req.userId });
    return res.status(500).json({ error: 'Failed to authenticate user' });
  }
  
  logger.info('Request authenticated', { userId: req.userId, email: req.userEmail });
  next();
}

module.exports = {
  authenticateToken
};

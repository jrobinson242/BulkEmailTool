const logger = require('../utils/logger');

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  // Store the access token for use in Graph API calls
  req.accessToken = token;
  
  // In a production app, you would also:
  // 1. Validate the token signature
  // 2. Check token expiration
  // 3. Extract user ID from token claims
  // For now, we'll use a placeholder userId
  req.userId = 'user-id-from-token'; // This should be extracted from the validated token
  
  logger.info('Request authenticated', { userId: req.userId });
  next();
}

module.exports = {
  authenticateToken
};

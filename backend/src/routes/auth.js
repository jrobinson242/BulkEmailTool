const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');

// Login endpoint - redirects to Azure AD
router.get('/login', (req, res) => {
  const authUrl = `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/oauth2/v2.0/authorize?` +
    `client_id=${process.env.AZURE_CLIENT_ID}` +
    `&response_type=code` +
    `&redirect_uri=${encodeURIComponent(process.env.REDIRECT_URI)}` +
    `&response_mode=query` +
    `&scope=${encodeURIComponent('openid profile email User.Read Contacts.Read Mail.Send offline_access')}`;
  
  res.json({ authUrl });
});

// Callback endpoint - exchanges code for token
router.post('/callback', async (req, res) => {
  try {
    const { code } = req.body;
    logger.info('Callback received', { hasCode: !!code });
    
    const tokenEndpoint = `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/oauth2/v2.0/token`;
    const params = new URLSearchParams({
      client_id: process.env.AZURE_CLIENT_ID,
      client_secret: process.env.AZURE_CLIENT_SECRET,
      code: code,
      redirect_uri: process.env.REDIRECT_URI,
      grant_type: 'authorization_code'
    });

    logger.info('Exchanging code for token');
    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params
    });

    const tokens = await response.json();
    logger.info('Token response received', { 
      hasAccessToken: !!tokens.access_token,
      hasError: !!tokens.error,
      error: tokens.error,
      errorDescription: tokens.error_description
    });
    
    if (tokens.error) {
      logger.error('Token exchange failed', { error: tokens.error, description: tokens.error_description });
      throw new Error(tokens.error_description || tokens.error);
    }

    res.json({
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresIn: tokens.expires_in
    });
  } catch (error) {
    logger.error('Callback error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: error.message });
  }
});

// Refresh token endpoint
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    const tokenEndpoint = `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/oauth2/v2.0/token`;
    const params = new URLSearchParams({
      client_id: process.env.AZURE_CLIENT_ID,
      client_secret: process.env.AZURE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    });

    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params
    });

    const tokens = await response.json();
    
    res.json({
      accessToken: tokens.access_token,
      expiresIn: tokens.expires_in
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get current user profile
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const GraphService = require('../services/graphService');
    const graphService = new GraphService(req.accessToken);
    const profile = await graphService.getUserProfile();
    res.json(profile);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

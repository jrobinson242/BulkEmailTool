const express = require('express');
const router = express.Router();
const rateCalculatorService = require('../services/rateCalculatorService');
const { authenticateToken } = require('../middleware/auth');

// Get all clients from SharePoint
router.get('/clients', authenticateToken, async (req, res) => {
  try {
    const clients = await rateCalculatorService.getClients(req.user);
    res.status(200).json(clients);
  } catch (error) {
    console.error('Failed to fetch clients', error);
    res.status(500).json({ error: 'Failed to fetch clients' });
  }
});

// Get all discounts from SharePoint
router.get('/discounts', authenticateToken, async (req, res) => {
  try {
    const discounts = await rateCalculatorService.getDiscounts(req.user);
    res.status(200).json(discounts);
  } catch (error) {
    console.error('Failed to fetch discounts', error);
    res.status(500).json({ error: 'Failed to fetch discounts' });
  }
});

module.exports = router;

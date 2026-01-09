const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticateToken } = require('../middleware/auth');
const rateClientsService = require('../services/rateClientsService');
const logger = require('../utils/logger');

// Configure multer for CSV file upload
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

/**
 * GET /api/rate-calculator/clients
 * Get all clients for current user
 */
router.get('/clients', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId; // Set by authenticateToken middleware
    const clients = await rateClientsService.getClients(userId);
    res.json(clients);
  } catch (error) {
    logger.error('Error fetching clients', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch clients' });
  }
});

/**
 * POST /api/rate-calculator/clients
 * Create a new client
 */
router.post('/clients', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;
    const { name, email, contact, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Client name is required' });
    }

    const client = await rateClientsService.createClient(userId, {
      name,
      email,
      contact,
      description
    });

    res.status(201).json(client);
  } catch (error) {
    logger.error('Error creating client', { error: error.message });
    res.status(500).json({ error: 'Failed to create client' });
  }
});

/**
 * PUT /api/rate-calculator/clients/:clientId
 * Update an existing client
 */
router.put('/clients/:clientId', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;
    const { clientId } = req.params;
    const { name, email, contact, description } = req.body;

    const client = await rateClientsService.updateClient(userId, clientId, {
      name,
      email,
      contact,
      description
    });

    res.json(client);
  } catch (error) {
    logger.error('Error updating client', { error: error.message });
    res.status(500).json({ error: 'Failed to update client' });
  }
});

/**
 * DELETE /api/rate-calculator/clients/:clientId
 * Delete a client
 */
router.delete('/clients/:clientId', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;
    const { clientId } = req.params;

    await rateClientsService.deleteClient(userId, clientId);
    res.json({ success: true });
  } catch (error) {
    logger.error('Error deleting client', { error: error.message });
    res.status(500).json({ error: 'Failed to delete client' });
  }
});

/**
 * POST /api/rate-calculator/clients/upload-csv
 * Upload and parse CSV file with clients
 */
router.post('/clients/upload-csv', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    const userId = req.userId;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const csvData = req.file.buffer.toString('utf-8');
    const result = await rateClientsService.uploadClientsFromCSV(userId, csvData);
    res.json(result);
  } catch (error) {
    logger.error('Error uploading CSV', { error: error.message });
    res.status(500).json({ error: 'Failed to upload CSV: ' + error.message });
  }
});

module.exports = router;

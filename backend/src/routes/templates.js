const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { executeQuery } = require('../config/database');
const TemplateService = require('../services/templateService');
const logger = require('../utils/logger');

// Get all templates
router.get('/', authenticateToken, async (req, res) => {
  try {
    const query = `
      SELECT * FROM Templates 
      WHERE UserId = @userId 
      ORDER BY CreatedAt DESC
    `;
    const result = await executeQuery(query, { userId: req.userId });
    res.json(result.recordset);
  } catch (error) {
    logger.error('Failed to fetch templates', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// Get single template
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const query = `
      SELECT * FROM Templates 
      WHERE TemplateId = @templateId AND UserId = @userId
    `;
    const result = await executeQuery(query, {
      templateId: req.params.id,
      userId: req.userId
    });
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    res.json(result.recordset[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create template
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, subject, body, description } = req.body;
    
    // Validate template syntax
    const validation = TemplateService.validateTemplate(body);
    if (!validation.isValid) {
      return res.status(400).json({ error: 'Invalid template syntax', errors: validation.errors });
    }
    
    // Extract placeholders
    const placeholders = TemplateService.extractPlaceholders(body);
    
    const query = `
      INSERT INTO Templates (UserId, Name, Subject, Body, Description, Placeholders, CreatedAt)
      OUTPUT INSERTED.*
      VALUES (@userId, @name, @subject, @body, @description, @placeholders, GETDATE())
    `;
    
    const result = await executeQuery(query, {
      userId: req.userId,
      name,
      subject,
      body,
      description: description || '',
      placeholders: JSON.stringify(placeholders)
    });
    
    res.status(201).json(result.recordset[0]);
  } catch (error) {
    logger.error('Failed to create template', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// Update template
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { name, subject, body, description } = req.body;
    
    // Validate template syntax
    const validation = TemplateService.validateTemplate(body);
    if (!validation.isValid) {
      return res.status(400).json({ error: 'Invalid template syntax', errors: validation.errors });
    }
    
    const placeholders = TemplateService.extractPlaceholders(body);
    
    const query = `
      UPDATE Templates 
      SET Name = @name, Subject = @subject, Body = @body, 
          Description = @description, Placeholders = @placeholders, UpdatedAt = GETDATE()
      OUTPUT INSERTED.*
      WHERE TemplateId = @templateId AND UserId = @userId
    `;
    
    const result = await executeQuery(query, {
      templateId: req.params.id,
      userId: req.userId,
      name,
      subject,
      body,
      description: description || '',
      placeholders: JSON.stringify(placeholders)
    });
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    res.json(result.recordset[0]);
  } catch (error) {
    logger.error('Failed to update template', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// Preview template with sample data
router.post('/:id/preview', authenticateToken, async (req, res) => {
  try {
    const { sampleData } = req.body;
    
    const query = `
      SELECT Body, Subject FROM Templates 
      WHERE TemplateId = @templateId AND UserId = @userId
    `;
    const result = await executeQuery(query, {
      templateId: req.params.id,
      userId: req.userId
    });
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    const template = result.recordset[0];
    const renderedSubject = TemplateService.renderTemplate(template.Subject, sampleData);
    const renderedBody = TemplateService.renderTemplate(template.Body, sampleData);
    
    res.json({
      subject: renderedSubject,
      body: renderedBody
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete template
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const query = `
      DELETE FROM Templates 
      WHERE TemplateId = @templateId AND UserId = @userId
    `;
    
    await executeQuery(query, {
      templateId: req.params.id,
      userId: req.userId
    });
    
    res.json({ message: 'Template deleted successfully' });
  } catch (error) {
    logger.error('Failed to delete template', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

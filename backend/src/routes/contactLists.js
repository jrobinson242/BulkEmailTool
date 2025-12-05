const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { executeQuery } = require('../config/database');
const logger = require('../utils/logger');

// Get all lists for user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const query = `
      SELECT cl.*, 
             COUNT(clm.ContactId) as ContactCount
      FROM ContactLists cl
      LEFT JOIN ContactListMembers clm ON cl.ListId = clm.ListId
      WHERE cl.UserId = @userId OR cl.IsGlobal = 1
      GROUP BY cl.ListId, cl.UserId, cl.Name, cl.Description, cl.CreatedAt, cl.UpdatedAt, cl.IsGlobal
      ORDER BY cl.CreatedAt DESC
    `;
    const result = await executeQuery(query, { userId: req.userId });
    res.json(result.recordset);
  } catch (error) {
    logger.error('Failed to fetch contact lists', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// Get single list with contacts
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const listQuery = `
      SELECT * FROM ContactLists 
      WHERE ListId = @listId AND (UserId = @userId OR IsGlobal = 1)
    `;
    const listResult = await executeQuery(listQuery, {
      listId: req.params.id,
      userId: req.userId
    });
    
    if (listResult.recordset.length === 0) {
      return res.status(404).json({ error: 'List not found' });
    }
    
    const contactsQuery = `
      SELECT c.*, clm.AddedAt
      FROM Contacts c
      INNER JOIN ContactListMembers clm ON c.ContactId = clm.ContactId
      WHERE clm.ListId = @listId
      ORDER BY clm.AddedAt DESC
    `;
    const contactsResult = await executeQuery(contactsQuery, {
      listId: req.params.id
    });
    
    res.json({
      list: listResult.recordset[0],
      contacts: contactsResult.recordset
    });
  } catch (error) {
    logger.error('Failed to fetch list details', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// Create new list
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, description, isGlobal } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'List name is required' });
    }
    
    const query = `
      INSERT INTO ContactLists (UserId, Name, Description, IsGlobal, CreatedAt)
      OUTPUT INSERTED.*
      VALUES (@userId, @name, @description, @isGlobal, GETDATE())
    `;
    
    const result = await executeQuery(query, {
      userId: req.userId,
      name,
      description: description || '',
      isGlobal: isGlobal || false
    });
    
    res.status(201).json(result.recordset[0]);
  } catch (error) {
    logger.error('Failed to create contact list', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// Update list
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { name, description, isGlobal } = req.body;
    
    const query = `
      UPDATE ContactLists 
      SET Name = @name, Description = @description, IsGlobal = @isGlobal, UpdatedAt = GETDATE()
      OUTPUT INSERTED.*
      WHERE ListId = @listId AND UserId = @userId
    `;
    
    const result = await executeQuery(query, {
      listId: req.params.id,
      userId: req.userId,
      name,
      description: description || '',
      isGlobal: isGlobal !== undefined ? isGlobal : false
    });
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'List not found' });
    }
    
    res.json(result.recordset[0]);
  } catch (error) {
    logger.error('Failed to update list', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// Delete list
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const query = `
      DELETE FROM ContactLists 
      WHERE ListId = @listId AND UserId = @userId
    `;
    
    await executeQuery(query, {
      listId: req.params.id,
      userId: req.userId
    });
    
    res.json({ message: 'List deleted successfully' });
  } catch (error) {
    logger.error('Failed to delete list', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// Add contacts to list
router.post('/:id/contacts', authenticateToken, async (req, res) => {
  try {
    const { contactIds } = req.body;
    
    if (!Array.isArray(contactIds) || contactIds.length === 0) {
      return res.status(400).json({ error: 'Contact IDs array is required' });
    }
    
    // Verify list ownership
    const listCheck = await executeQuery(
      'SELECT ListId FROM ContactLists WHERE ListId = @listId AND UserId = @userId',
      { listId: req.params.id, userId: req.userId }
    );
    
    if (listCheck.recordset.length === 0) {
      return res.status(404).json({ error: 'List not found' });
    }
    
    // Add contacts to list (ignore duplicates)
    const values = contactIds.map((_, index) => `(@listId, @contactId${index}, GETDATE())`).join(',');
    const params = { listId: req.params.id };
    contactIds.forEach((id, index) => {
      params[`contactId${index}`] = id;
    });
    
    const query = `
      INSERT INTO ContactListMembers (ListId, ContactId, AddedAt)
      VALUES ${values}
    `;
    
    try {
      await executeQuery(query, params);
      res.json({ message: `${contactIds.length} contact(s) added to list` });
    } catch (err) {
      // Handle duplicate key errors gracefully
      if (err.message.includes('duplicate')) {
        res.json({ message: 'Contacts added (some may have already been in the list)' });
      } else {
        throw err;
      }
    }
  } catch (error) {
    logger.error('Failed to add contacts to list', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// Remove contact from list
router.delete('/:id/contacts/:contactId', authenticateToken, async (req, res) => {
  try {
    // Verify list ownership
    const listCheck = await executeQuery(
      'SELECT ListId FROM ContactLists WHERE ListId = @listId AND UserId = @userId',
      { listId: req.params.id, userId: req.userId }
    );
    
    if (listCheck.recordset.length === 0) {
      return res.status(404).json({ error: 'List not found' });
    }
    
    const query = `
      DELETE FROM ContactListMembers 
      WHERE ListId = @listId AND ContactId = @contactId
    `;
    
    await executeQuery(query, {
      listId: req.params.id,
      contactId: req.params.contactId
    });
    
    res.json({ message: 'Contact removed from list' });
  } catch (error) {
    logger.error('Failed to remove contact from list', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

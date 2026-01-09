const sql = require('mssql');
const logger = require('../utils/logger');
const dbConfig = require('../config/database');

/**
 * Get all clients for a user
 */
async function getClients(userId) {
  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool
      .request()
      .input('userId', sql.NVarChar, userId)
      .query('SELECT * FROM RateClients WHERE UserId = @userId AND Visible = 1 ORDER BY Title');
    
    return result.recordset;
  } catch (error) {
    logger.error('Error fetching clients from database', { error: error.message });
    throw error;
  }
}

/**
 * Create a new client
 */
async function createClient(userId, clientData) {
  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool
      .request()
      .input('userId', sql.NVarChar, userId)
      .input('title', sql.NVarChar, clientData.title)
      .input('msp', sql.NVarChar, clientData.msp || null)
      .input('tool', sql.NVarChar, clientData.tool || null)
      .input('mspFee', sql.Decimal(10, 2), clientData.mspFee || null)
      .input('otherDiscounts', sql.NVarChar(sql.MAX), clientData.otherDiscounts || null)
      .input('totalDiscounts', sql.Decimal(10, 2), clientData.totalDiscounts || null)
      .input('markupW2', sql.Decimal(10, 2), clientData.markupW2 || null)
      .input('markupC2C', sql.Decimal(10, 2), clientData.markupC2C || null)
      .input('c2cFriendly', sql.NVarChar, clientData.c2cFriendly || null)
      .input('conversionMaxLength', sql.NVarChar, clientData.conversionMaxLength || null)
      .input('startingFee', sql.Decimal(10, 2), clientData.startingFee || null)
      .input('otRate', sql.NVarChar, clientData.otRate || null)
      .input('visible', sql.Bit, clientData.visible !== false ? 1 : 0)
      .query(`
        INSERT INTO RateClients (UserId, Title, MSP, Tool, MSPFee, OtherDiscounts, TotalDiscounts, MarkupW2, MarkupC2C, C2CFriendly, ConversionMaxLength, StartingFee, OTRate, Visible)
        VALUES (@userId, @title, @msp, @tool, @mspFee, @otherDiscounts, @totalDiscounts, @markupW2, @markupC2C, @c2cFriendly, @conversionMaxLength, @startingFee, @otRate, @visible);
        SELECT * FROM RateClients WHERE ClientId = SCOPE_IDENTITY();
      `);

    return result.recordset[0];
  } catch (error) {
    logger.error('Error creating client', { error: error.message });
    throw error;
  }
}

/**
 * Update an existing client
 */
async function updateClient(userId, clientId, clientData) {
  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool
      .request()
      .input('clientId', sql.Int, clientId)
      .input('userId', sql.NVarChar, userId)
      .input('title', sql.NVarChar, clientData.title)
      .input('msp', sql.NVarChar, clientData.msp || null)
      .input('tool', sql.NVarChar, clientData.tool || null)
      .input('mspFee', sql.Decimal(10, 2), clientData.mspFee || null)
      .input('otherDiscounts', sql.NVarChar(sql.MAX), clientData.otherDiscounts || null)
      .input('totalDiscounts', sql.Decimal(10, 2), clientData.totalDiscounts || null)
      .input('markupW2', sql.Decimal(10, 2), clientData.markupW2 || null)
      .input('markupC2C', sql.Decimal(10, 2), clientData.markupC2C || null)
      .input('c2cFriendly', sql.NVarChar, clientData.c2cFriendly || null)
      .input('conversionMaxLength', sql.NVarChar, clientData.conversionMaxLength || null)
      .input('startingFee', sql.Decimal(10, 2), clientData.startingFee || null)
      .input('otRate', sql.NVarChar, clientData.otRate || null)
      .input('visible', sql.Bit, clientData.visible !== false ? 1 : 0)
      .query(`
        UPDATE RateClients 
        SET Title = @title, MSP = @msp, Tool = @tool, MSPFee = @mspFee, OtherDiscounts = @otherDiscounts, 
            TotalDiscounts = @totalDiscounts, MarkupW2 = @markupW2, MarkupC2C = @markupC2C, 
            C2CFriendly = @c2cFriendly, ConversionMaxLength = @conversionMaxLength, StartingFee = @startingFee, 
            OTRate = @otRate, Visible = @visible, UpdatedAt = GETDATE()
        WHERE ClientId = @clientId AND UserId = @userId;
        SELECT * FROM RateClients WHERE ClientId = @clientId;
      `);

    if (result.recordset.length === 0) {
      throw new Error('Client not found or unauthorized');
    }

    return result.recordset[0];
  } catch (error) {
    logger.error('Error updating client', { error: error.message });
    throw error;
  }
}

/**
 * Delete a client
 */
async function deleteClient(userId, clientId) {
  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool
      .request()
      .input('clientId', sql.Int, clientId)
      .input('userId', sql.NVarChar, userId)
      .query('DELETE FROM RateClients WHERE ClientId = @clientId AND UserId = @userId');

    if (result.rowsAffected[0] === 0) {
      throw new Error('Client not found or unauthorized');
    }

    return true;
  } catch (error) {
    logger.error('Error deleting client', { error: error.message });
    throw error;
  }
}

/**
 * Parse a single CSV line, handling quoted fields properly
 */
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  // Add the last field
  result.push(current.trim());
  return result;
}

/**
 * Upload clients from CSV data
 * Expected CSV format: Title, MSP, Tool, MSPFee, OtherDiscounts, TotalDiscounts, MarkupW2, MarkupC2C, C2CFriendly, ConversionMaxLength, StartingFee, OTRate, Visible
 */
async function uploadClientsFromCSV(userId, csvData) {
  try {
    // Remove BOM if present
    csvData = csvData.replace(/^\uFEFF/, '');
    
    // Parse CSV - handle different line endings
    const lines = csvData.split(/\r?\n/).filter(line => line.trim());
    
    if (lines.length < 2) {
      throw new Error('CSV file must contain header row and at least one data row');
    }
    
    const headers = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase());
    
    const fieldMap = {
      'title': 'title',
      'name': 'title', // Allow 'name' as alias for 'title'
      'msp': 'msp',
      'tool': 'tool',
      'mspfee': 'mspFee',
      'msp fee': 'mspFee',
      'otherdiscounts': 'otherDiscounts',
      'other discounts': 'otherDiscounts',
      'totaldiscounts': 'totalDiscounts',
      'total discounts': 'totalDiscounts',
      'markupw2': 'markupW2',
      'markup w2': 'markupW2',
      'markupc2c': 'markupC2C',
      'markup c2c': 'markupC2C',
      'c2cfriendly': 'c2cFriendly',
      'c2c friendly': 'c2cFriendly',
      'conversionmaxlength': 'conversionMaxLength',
      'conversion max length': 'conversionMaxLength',
      'startingfee': 'startingFee',
      'starting fee': 'startingFee',
      'otrate': 'otRate',
      'ot rate': 'otRate',
      'visible': 'visible'
    };

    const indices = {};
    headers.forEach((header, idx) => {
      if (fieldMap[header]) {
        indices[fieldMap[header]] = idx;
      }
    });

    if (indices.title === undefined) {
      throw new Error('CSV must have a "Title" or "Name" column. Found headers: ' + headers.join(', '));
    }

    const clients = [];
    const errors = [];

    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;

      try {
        const values = parseCSVLine(lines[i]);
        const title = values[indices.title];

        if (!title) {
          errors.push(`Row ${i + 1}: Title is required`);
          continue;
        }

        const clientData = {
          title,
          msp: indices.msp !== undefined ? values[indices.msp] : undefined,
          tool: indices.tool !== undefined ? values[indices.tool] : undefined,
          mspFee: indices.mspFee !== undefined ? parseFloat(values[indices.mspFee]) || null : undefined,
          otherDiscounts: indices.otherDiscounts !== undefined ? values[indices.otherDiscounts] : undefined,
          totalDiscounts: indices.totalDiscounts !== undefined ? parseFloat(values[indices.totalDiscounts]) || null : undefined,
          markupW2: indices.markupW2 !== undefined ? parseFloat(values[indices.markupW2]) || null : undefined,
          markupC2C: indices.markupC2C !== undefined ? parseFloat(values[indices.markupC2C]) || null : undefined,
          c2cFriendly: indices.c2cFriendly !== undefined ? values[indices.c2cFriendly] : undefined,
          conversionMaxLength: indices.conversionMaxLength !== undefined ? values[indices.conversionMaxLength] : undefined,
          startingFee: indices.startingFee !== undefined ? parseFloat(values[indices.startingFee]) || null : undefined,
          otRate: indices.otRate !== undefined ? values[indices.otRate] : undefined,
          visible: indices.visible !== undefined ? values[indices.visible].toLowerCase() !== 'false' : true
        };

        const client = await createClient(userId, clientData);
        clients.push(client);
      } catch (err) {
        errors.push(`Row ${i + 1}: ${err.message}`);
      }
    }

    return {
      success: true,
      imported: clients.length,
      total: lines.length - 1,
      errors,
      clients
    };
  } catch (error) {
    logger.error('Error uploading CSV', { error: error.message });
    throw error;
  }
}

module.exports = {
  getClients,
  createClient,
  updateClient,
  deleteClient,
  uploadClientsFromCSV
};

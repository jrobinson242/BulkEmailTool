const graphService = require('./graphService');
const logger = require('../utils/logger');

// Configuration - Update these with your actual SharePoint site and list IDs
const SHAREPOINT_CONFIG = {
  CLIENTS_LIST_ID: process.env.SHAREPOINT_CLIENTS_LIST_ID || 'clients-list-id',
  CLIENTS_LIST_NAME: process.env.SHAREPOINT_CLIENTS_LIST_NAME || 'Clients',
  DISCOUNTS_LIST_ID: process.env.SHAREPOINT_DISCOUNTS_LIST_ID || 'discounts-list-id',
  DISCOUNTS_LIST_NAME: process.env.SHAREPOINT_DISCOUNTS_LIST_NAME || 'Discounts',
  SITE_ID: process.env.SHAREPOINT_SITE_ID || 'site-id'
};

/**
 * Get all clients from SharePoint
 * @param {Object} user - User object with access token
 * @returns {Promise<Array>} Array of clients
 */
async function getClients(user) {
  try {
    // Using Graph API to query SharePoint list
    // Format: /sites/{site-id}/lists/{list-id}/items
    const endpoint = `/sites/${SHAREPOINT_CONFIG.SITE_ID}/lists/${SHAREPOINT_CONFIG.CLIENTS_LIST_ID}/items?$expand=fields`;
    
    const response = await graphService.makeGraphRequest(
      endpoint,
      'GET',
      user.accessToken
    );

    // Transform the response to extract relevant fields
    const clients = response.value.map(item => ({
      id: item.id,
      name: item.fields.Title || item.fields.ClientName || 'Unnamed Client',
      // Add other relevant fields as needed
      email: item.fields.Email || '',
      contact: item.fields.Contact || ''
    }));

    logger.info('Successfully fetched clients from SharePoint', { count: clients.length });
    return clients;
  } catch (error) {
    logger.error('Failed to fetch clients from SharePoint', { error: error.message });
    throw error;
  }
}

/**
 * Get all discounts from SharePoint
 * @param {Object} user - User object with access token
 * @returns {Promise<Array>} Array of discounts
 */
async function getDiscounts(user) {
  try {
    // Using Graph API to query SharePoint list
    const endpoint = `/sites/${SHAREPOINT_CONFIG.SITE_ID}/lists/${SHAREPOINT_CONFIG.DISCOUNTS_LIST_ID}/items?$expand=fields`;
    
    const response = await graphService.makeGraphRequest(
      endpoint,
      'GET',
      user.accessToken
    );

    // Transform the response to extract relevant fields
    const discounts = response.value.map(item => ({
      id: item.id,
      name: item.fields.Title || item.fields.DiscountName || 'Unnamed Discount',
      value: parseFloat(item.fields.Value || item.fields.DiscountValue || 0)
    }));

    logger.info('Successfully fetched discounts from SharePoint', { count: discounts.length });
    return discounts;
  } catch (error) {
    logger.error('Failed to fetch discounts from SharePoint', { error: error.message });
    throw error;
  }
}

module.exports = {
  getClients,
  getDiscounts
};

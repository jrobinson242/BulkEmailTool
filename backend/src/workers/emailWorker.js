const { QueueClient } = require('@azure/storage-queue');
const GraphService = require('../services/graphService');
const { executeQuery } = require('../config/database');
const logger = require('../utils/logger');

class EmailWorker {
  constructor() {
    this.isRunning = false;
    this.pollInterval = 5000; // Poll every 5 seconds
    this.batchSize = 10; // Process 10 messages at a time
    this.queueClient = null;
  }

  async initialize() {
    try {
      const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
      if (!connectionString) {
        throw new Error('AZURE_STORAGE_CONNECTION_STRING not configured');
      }

      this.queueClient = new QueueClient(connectionString, 'email-queue');
      await this.queueClient.createIfNotExists();
      logger.info('Email worker initialized');
    } catch (error) {
      logger.error('Failed to initialize email worker', { error: error.message });
      throw error;
    }
  }

  async start() {
    if (this.isRunning) {
      logger.warn('Email worker is already running');
      return;
    }

    this.isRunning = true;
    logger.info('Email worker started');
    this.processQueue();
  }

  stop() {
    this.isRunning = false;
    logger.info('Email worker stopped');
  }

  async processQueue() {
    while (this.isRunning) {
      try {
        await this.processBatch();
      } catch (error) {
        logger.error('Error processing queue batch', { error: error.message });
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, this.pollInterval));
    }
  }

  async processBatch() {
    try {
      // Receive messages from queue
      const response = await this.queueClient.receiveMessages({
        numberOfMessages: this.batchSize,
        visibilityTimeout: 300 // 5 minutes to process
      });

      if (!response.receivedMessageItems || response.receivedMessageItems.length === 0) {
        return;
      }

      logger.info(`Processing ${response.receivedMessageItems.length} email messages`);

      // Process each message
      for (const message of response.receivedMessageItems) {
        try {
          await this.processMessage(message);
          
          // Delete message from queue after successful processing
          await this.queueClient.deleteMessage(message.messageId, message.popReceipt);
        } catch (error) {
          logger.error('Failed to process message', { 
            messageId: message.messageId, 
            error: error.message 
          });
          
          // Message will become visible again after visibilityTimeout
          // Consider implementing a dead letter queue for repeated failures
        }
      }
    } catch (error) {
      logger.error('Error in processBatch', { error: error.message });
    }
  }

  async processMessage(message) {
    let emailData;
    try {
      // Decode message
      const messageText = Buffer.from(message.messageText, 'base64').toString('utf-8');
      emailData = JSON.parse(messageText);

      logger.info(`Processing email for ${emailData.recipient}`, {
        campaignId: emailData.campaignId,
        contactId: emailData.contactId
      });

      // Use access token from the message
      const accessToken = emailData.accessToken;
      
      if (!accessToken) {
        throw new Error('Access token not found in message');
      }

      // Send email via Microsoft Graph
      const graphService = new GraphService(accessToken);
      await graphService.sendEmail(
        emailData.recipient,
        emailData.subject,
        emailData.body,
        true // isHtml
      );

      logger.info(`Email sent successfully to ${emailData.recipient}`);

      // Update log status to 'sent'
      await executeQuery(`
        UPDATE CampaignLogs 
        SET Status = 'sent', SentAt = GETDATE()
        WHERE CampaignId = @campaignId AND ContactId = @contactId AND Status = 'queued'
      `, {
        campaignId: emailData.campaignId,
        contactId: emailData.contactId
      });

      // Check if campaign is complete
      await this.checkCampaignCompletion(emailData.campaignId);

    } catch (error) {
      logger.error('Failed to send email', { 
        error: error.message,
        recipient: emailData?.recipient 
      });

      // Update log status to 'failed'
      if (emailData) {
        try {
          await executeQuery(`
            UPDATE CampaignLogs 
            SET Status = 'failed', ErrorMessage = @errorMessage
            WHERE CampaignId = @campaignId AND ContactId = @contactId AND Status = 'queued'
          `, {
            campaignId: emailData.campaignId,
            contactId: emailData.contactId,
            errorMessage: error.message
          });
        } catch (dbError) {
          logger.error('Failed to update log status', { error: dbError.message });
        }
      }

      throw error;
    }
  }

  async checkCampaignCompletion(campaignId) {
    try {
      // Check if all emails have been processed
      const statusQuery = `
        SELECT 
          COUNT(*) as Total,
          SUM(CASE WHEN Status = 'queued' THEN 1 ELSE 0 END) as Queued
        FROM CampaignLogs
        WHERE CampaignId = @campaignId
      `;

      const result = await executeQuery(statusQuery, { campaignId });
      const stats = result.recordset[0];

      // If no more queued emails, mark campaign as completed
      if (stats.Queued === 0 && stats.Total > 0) {
        await executeQuery(`
          UPDATE Campaigns 
          SET Status = 'completed', CompletedAt = GETDATE()
          WHERE CampaignId = @campaignId AND Status = 'sending'
        `, { campaignId });

        logger.info(`Campaign ${campaignId} completed`);
      }
    } catch (error) {
      logger.error('Failed to check campaign completion', { 
        campaignId, 
        error: error.message 
      });
    }
  }
}

module.exports = EmailWorker;

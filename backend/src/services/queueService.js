const { QueueClient } = require('@azure/storage-queue');
const logger = require('../utils/logger');

class QueueService {
  constructor() {
    this.connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    this.queueName = 'email-queue';
    this.queueClient = null;
  }

  async initialize() {
    if (!this.queueClient) {
      this.queueClient = new QueueClient(this.connectionString, this.queueName);
      await this.queueClient.createIfNotExists();
      logger.info('Queue service initialized');
    }
  }

  async addEmailToQueue(emailData) {
    try {
      await this.initialize();
      const message = Buffer.from(JSON.stringify(emailData)).toString('base64');
      await this.queueClient.sendMessage(message);
      logger.info(`Email queued for ${emailData.recipient}`);
      return { success: true };
    } catch (error) {
      logger.error('Failed to queue email', { error: error.message });
      throw error;
    }
  }

  async processQueue(processingFunction) {
    try {
      await this.initialize();
      const messages = await this.queueClient.receiveMessages({ numberOfMessages: 32 });
      
      for (const message of messages.receivedMessageItems || []) {
        try {
          const emailData = JSON.parse(Buffer.from(message.messageText, 'base64').toString());
          await processingFunction(emailData);
          await this.queueClient.deleteMessage(message.messageId, message.popReceipt);
          logger.info(`Processed and removed message: ${message.messageId}`);
        } catch (error) {
          logger.error(`Failed to process message: ${message.messageId}`, { error: error.message });
        }
      }
    } catch (error) {
      logger.error('Queue processing error', { error: error.message });
      throw error;
    }
  }

  async clearQueue() {
    try {
      await this.initialize();
      await this.queueClient.clearMessages();
      logger.info('Queue cleared');
      return { success: true };
    } catch (error) {
      logger.error('Failed to clear queue', { error: error.message });
      throw error;
    }
  }
}

module.exports = new QueueService();

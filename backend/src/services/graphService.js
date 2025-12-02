const { Client } = require('@microsoft/microsoft-graph-client');
const { ClientSecretCredential } = require('@azure/identity');
const logger = require('../utils/logger');

class GraphService {
  constructor(accessToken) {
    this.accessToken = accessToken;
    this.client = Client.init({
      authProvider: (done) => {
        done(null, this.accessToken);
      }
    });
  }

  // Get user's Outlook contacts
  async getContacts(top = 100, skip = 0) {
    try {
      const contacts = await this.client
        .api('/me/contacts')
        .top(top)
        .skip(skip)
        .select('id,displayName,emailAddresses,givenName,surname,companyName,jobTitle,businessPhones,mobilePhone')
        .get();
      
      logger.info(`Retrieved ${contacts.value.length} contacts`);
      return contacts.value;
    } catch (error) {
      logger.error('Failed to fetch contacts', { error: error.message });
      throw error;
    }
  }

  // Send a single email
  async sendEmail(recipient, subject, body, isHtml = true) {
    try {
      const message = {
        subject: subject,
        body: {
          contentType: isHtml ? 'HTML' : 'Text',
          content: body
        },
        toRecipients: [
          {
            emailAddress: {
              address: recipient
            }
          }
        ]
      };

      await this.client
        .api('/me/sendMail')
        .post({
          message: message,
          saveToSentItems: true
        });

      logger.info(`Email sent to ${recipient}`);
      return { success: true, recipient };
    } catch (error) {
      logger.error(`Failed to send email to ${recipient}`, { error: error.message });
      throw error;
    }
  }

  // Send bulk emails with batching
  async sendBulkEmails(emails, batchSize = 50, delayMs = 2000) {
    const results = [];
    
    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);
      
      logger.info(`Sending batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(emails.length / batchSize)}`);
      
      const batchPromises = batch.map(email => 
        this.sendEmail(email.recipient, email.subject, email.body, email.isHtml)
          .then(result => ({ ...result, success: true }))
          .catch(error => ({ 
            recipient: email.recipient, 
            success: false, 
            error: error.message 
          }))
      );

      const batchResults = await Promise.allSettled(batchPromises);
      results.push(...batchResults.map(r => r.value || r.reason));

      // Delay between batches to avoid rate limiting
      if (i + batchSize < emails.length) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    return results;
  }

  // Get user profile
  async getUserProfile() {
    try {
      const user = await this.client
        .api('/me')
        .select('id,displayName,mail,userPrincipalName')
        .get();
      
      return user;
    } catch (error) {
      logger.error('Failed to fetch user profile', { error: error.message });
      throw error;
    }
  }
}

module.exports = GraphService;

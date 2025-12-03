const { Client } = require('@microsoft/microsoft-graph-client');
const { ClientSecretCredential } = require('@azure/identity');
const logger = require('../utils/logger');

class GraphService {
  constructor(accessToken, userEmail = null) {
    this.accessToken = accessToken;
    this.userEmail = userEmail;
    this.client = Client.init({
      authProvider: (done) => {
        done(null, this.accessToken);
      }
    });
  }

  // Get user's contact folders
  async getContactFolders() {
    try {
      // Get top-level contact folders
      const folders = await this.client
        .api('/me/contactFolders')
        .select('id,displayName,parentFolderId')
        .get();
      
      logger.info(`Retrieved ${folders.value.length} contact folders`);
      
      // Also get child folders for each folder (nested folders/lists)
      const allFolders = [...folders.value];
      
      for (const folder of folders.value) {
        try {
          const childFolders = await this.client
            .api(`/me/contactFolders/${folder.id}/childFolders`)
            .select('id,displayName,parentFolderId')
            .get();
          
          if (childFolders.value && childFolders.value.length > 0) {
            logger.info(`Found ${childFolders.value.length} child folders in ${folder.displayName}`);
            allFolders.push(...childFolders.value);
          }
        } catch (childError) {
          logger.error(`Failed to fetch child folders for ${folder.displayName}`, { error: childError.message });
          // Continue with other folders
        }
      }
      
      // Try to get People/Contacts folder specifically (where contact lists often live)
      try {
        logger.info('Attempting to fetch from wellKnownFolders...');
        const wellKnownFolder = await this.client
          .api('/me/contactFolders/Contacts/childFolders')
          .select('id,displayName,parentFolderId')
          .get();
        
        if (wellKnownFolder.value && wellKnownFolder.value.length > 0) {
          logger.info(`Found ${wellKnownFolder.value.length} folders in well-known Contacts folder`);
          // Add any that aren't already in our list
          const existingIds = new Set(allFolders.map(f => f.id));
          for (const folder of wellKnownFolder.value) {
            if (!existingIds.has(folder.id)) {
              allFolders.push(folder);
            }
          }
        }
      } catch (wellKnownError) {
        logger.error('Failed to fetch well-known Contacts folder', { error: wellKnownError.message });
      }
      
      logger.info(`Total folders (including nested): ${allFolders.length}`);
      return allFolders;
    } catch (error) {
      logger.error('Failed to fetch contact folders', { error: error.message });
      throw error;
    }
  }

  // Get contacts from a specific folder
  async getContactsFromFolder(folderId, top = 1000) {
    try {
      const contacts = await this.client
        .api(`/me/contactFolders/${folderId}/contacts`)
        .top(top)
        .select('id,displayName,emailAddresses,givenName,surname,companyName,jobTitle,businessPhones,mobilePhone')
        .get();
      
      return contacts.value;
    } catch (error) {
      logger.error(`Failed to fetch contacts from folder ${folderId}`, { error: error.message });
      throw error;
    }
  }

  // Get all contacts from all folders
  async getAllContactsFromFolders() {
    try {
      logger.info('Getting contact folders...');
      const folders = await this.getContactFolders();
      logger.info(`Found ${folders.length} contact folders`);
      
      const allContacts = [];
      
      // If folders found, get contacts from each folder
      if (folders.length > 0) {
        for (const folder of folders) {
          logger.info(`Fetching contacts from folder: ${folder.displayName} (${folder.id})`);
          try {
            const folderContacts = await this.getContactsFromFolder(folder.id);
            logger.info(`Found ${folderContacts.length} contacts in folder: ${folder.displayName}`);
            
            // Tag contacts with their folder name
            const taggedContacts = folderContacts.map(contact => ({
              ...contact,
              folderName: folder.displayName,
              folderId: folder.id
            }));
            
            allContacts.push(...taggedContacts);
          } catch (folderError) {
            logger.error(`Failed to fetch contacts from folder ${folder.displayName}`, { error: folderError.message });
            // Continue with other folders
          }
        }
      }
      
      // Also try to get contacts from the default /me/contacts endpoint
      // This catches contacts that might not be in specific folders
      logger.info('Fetching contacts from default endpoint...');
      try {
        const defaultContacts = await this.getContacts(1000);
        logger.info(`Retrieved ${defaultContacts.length} contacts from default endpoint`);
        
        // Only add contacts that aren't already in our list (avoid duplicates)
        const existingIds = new Set(allContacts.map(c => c.id));
        const uniqueDefaultContacts = defaultContacts
          .filter(c => !existingIds.has(c.id))
          .map(contact => ({
            ...contact,
            folderName: 'My Contacts',
            folderId: 'default'
          }));
        
        logger.info(`Adding ${uniqueDefaultContacts.length} unique contacts from default endpoint`);
        allContacts.push(...uniqueDefaultContacts);
      } catch (defaultError) {
        logger.error('Failed to fetch from default contacts endpoint', { error: defaultError.message });
      }
      
      logger.info(`Retrieved total of ${allContacts.length} contacts from all sources`);
      return allContacts;
    } catch (error) {
      logger.error('Failed to fetch all contacts from folders', { error: error.message, stack: error.stack });
      throw error;
    }
  }

  // Get user's Outlook contacts (legacy - now gets from all folders)
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

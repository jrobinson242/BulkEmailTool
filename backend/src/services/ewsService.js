const { 
  ExchangeService, 
  ExchangeVersion, 
  Uri,
  WebCredentials,
  ContactGroup,
  ItemView,
  WellKnownFolderName,
  PropertySet
} = require('ews-javascript-api');
const logger = require('../utils/logger');

class EWSService {
  constructor(userEmail, accessToken) {
    this.userEmail = userEmail;
    this.accessToken = accessToken;
    this.service = new ExchangeService(ExchangeVersion.Exchange2013_SP1);
    
    // Use OAuth token for authentication
    this.service.Url = new Uri('https://outlook.office365.com/EWS/Exchange.asmx');
    this.service.Credentials = new WebCredentials(accessToken);
  }

  // Get all contact groups (distribution lists)
  async getContactGroups() {
    try {
      logger.info('Fetching contact groups via EWS');
      
      const view = new ItemView(100);
      const results = await this.service.FindItems(
        WellKnownFolderName.Contacts,
        view
      );

      const contactGroups = [];
      
      for (const item of results.Items) {
        if (item instanceof ContactGroup) {
          await item.Load(PropertySet.FirstClassProperties);
          
          const members = [];
          if (item.Members && item.Members.Count > 0) {
            for (let i = 0; i < item.Members.Count; i++) {
              const member = item.Members.__thisIndexer(i);
              if (member.AddressInformation) {
                members.push({
                  name: member.AddressInformation.Name,
                  email: member.AddressInformation.Address
                });
              }
            }
          }
          
          contactGroups.push({
            id: item.Id.UniqueId,
            displayName: item.DisplayName,
            memberCount: members.length,
            members: members,
            type: 'distribution-list'
          });
        }
      }
      
      logger.info(`Found ${contactGroups.length} contact groups via EWS`);
      return contactGroups;
    } catch (error) {
      logger.error('Failed to fetch contact groups via EWS', { error: error.message });
      throw error;
    }
  }

  // Expand a specific contact group to get all members
  async expandContactGroup(groupId) {
    try {
      logger.info(`Expanding contact group: ${groupId}`);
      
      const group = await ContactGroup.Bind(
        this.service,
        groupId,
        PropertySet.FirstClassProperties
      );

      await group.Load();

      const members = [];
      if (group.Members && group.Members.Count > 0) {
        for (let i = 0; i < group.Members.Count; i++) {
          const member = group.Members.__thisIndexer(i);
          if (member.AddressInformation) {
            members.push({
              displayName: member.AddressInformation.Name,
              email: member.AddressInformation.Address
            });
          }
        }
      }

      logger.info(`Expanded contact group with ${members.length} members`);
      return members;
    } catch (error) {
      logger.error('Failed to expand contact group', { error: error.message });
      throw error;
    }
  }
}

module.exports = EWSService;

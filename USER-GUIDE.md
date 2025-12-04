# Bulk Email Tool - User Guide

## Overview
The Bulk Email Tool allows you to send personalized bulk emails to your contacts using your Microsoft 365/Outlook account. Track engagement with open and click tracking.

## Getting Started

### 1. Sign In
- Click "Sign in with Microsoft" on the login page
- Authorize the application to access your Outlook contacts and send emails on your behalf

### 2. Manage Contacts

#### Import Contacts
You have three ways to add contacts:

**From Outlook:**
1. Click "Select Sources to Sync" on the Contacts page
2. Choose entire contact folders OR select individual contacts
3. Use the search box to find specific contacts
4. Click "Sync" to import

**Upload CSV:**
1. Click "Upload CSV" on the Contacts page
2. Review the format instructions in the dialog
3. Your CSV should have headers: Email (required), FirstName, LastName, Company, JobTitle, Phone, Tags
4. Click "Choose CSV File" to upload

**Add Manually:**
1. Click "Add Contact" on the Contacts page
2. Fill in the contact details
3. Click "Create Contact"

#### Manage Contacts
- **Edit:** Click "Edit" next to any contact to update their information
- **Delete:** Select contacts using checkboxes, then click "Delete Selected"

### 3. Create Email Templates

1. Go to the **Templates** page
2. Click "Create Template"
3. Enter a template name and subject line
4. Use the WYSIWYG editor to compose your email
5. Add personalization placeholders:
   - `{{FirstName}}` - Contact's first name
   - `{{LastName}}` - Contact's last name
   - `{{Email}}` - Contact's email
   - `{{Company}}` - Contact's company
   - `{{JobTitle}}` - Contact's job title
6. Click "Save Template"

**Tip:** Use the formatting toolbar to add images, links, lists, and styling to your emails.

### 4. Create and Send Campaigns

1. Go to the **Campaigns** page
2. Click "Create Campaign"
3. Enter a campaign name
4. Select a template from the dropdown
5. Select recipients:
   - Choose individual contacts using checkboxes, OR
   - Click "Select All" to include all contacts
6. Click "Create Campaign"
7. Review the campaign details
8. Click "Send Campaign" to queue emails for sending

**Note:** Emails are sent in batches with delays to respect rate limits. This happens automatically in the background.

### 5. Track Campaign Performance

1. Go to the **Campaigns** page
2. Click on any campaign name to view details
3. View engagement metrics:
   - Total emails sent
   - Open rate (tracked via invisible pixel)
   - Click rate (tracked via link clicks)
   - Failed deliveries
4. See the collapsible email content panel
5. View detailed logs showing delivery status for each recipient

### 6. Monitor Dashboard

The **Dashboard** page shows:
- Total contacts in your database
- Total email campaigns created
- Total emails sent
- Overall engagement rates
- Recent campaign performance
- Queue status (if emails are pending)

## Features

### Queue Management
- If you see queued or failed emails in the dashboard, you can clear them using the "Clear Queue" button
- Only appears when there are items in the queue

### Email Tracking
- **Opens:** Tracked automatically when recipients view the email
- **Clicks:** Tracked when recipients click links in your email
- Note: Tracking only works after deployment (not on localhost)

### Search and Filter
- Use the search box in the sync dialog to find specific contacts or folders
- Filter contacts in your list by name, email, company, or job title

## Best Practices

1. **Test First:** Create a test campaign with just your own email address before sending to all contacts
2. **Personalize:** Use placeholder fields to make emails feel personal
3. **Segment:** Use tags to organize contacts and send targeted campaigns
4. **Monitor:** Check campaign analytics to see what resonates with your audience
5. **Respect Limits:** The app includes built-in rate limiting to avoid sending too many emails at once

## Troubleshooting

**"Failed to initiate login"**
- Ensure you're using the correct Azure AD credentials
- Check that redirect URIs are configured in Azure AD

**"Session expired"**
- Sign out and sign back in to refresh your authentication token

**Emails not sending**
- Check the queue status on the Dashboard
- Verify your Microsoft 365 account has permission to send emails
- Check campaign logs for specific error messages

**CSV import failed**
- Ensure your CSV has a header row with "Email" column
- Check that email addresses are valid
- Review the format instructions in the upload dialog

## Support

For issues or questions, check the application logs or contact your administrator.

# Rate Calculator Configuration

This file documents how to configure the Rate Calculator to pull data from SharePoint lists.

## Environment Variables

Add the following environment variables to your `.env` file:

```
# SharePoint Configuration
SHAREPOINT_SITE_ID=your-sharepoint-site-id
SHAREPOINT_CLIENTS_LIST_ID=clients-list-id
SHAREPOINT_CLIENTS_LIST_NAME=Clients
SHAREPOINT_DISCOUNTS_LIST_ID=discounts-list-id
SHAREPOINT_DISCOUNTS_LIST_NAME=Discounts
```

## Getting Your SharePoint Site ID

1. Go to your SharePoint site
2. Open DevTools (F12) → Network tab
3. Visit the Lists page
4. Look for a request containing `/_vti_bin/client.svc`
5. The Site ID will be in the response or URL

Alternatively, use Microsoft Graph:
```powershell
# Get site ID using Azure CLI
az graph query --query "sites?search=*yoursitename*" --resource "https://graph.microsoft.com"
```

## Setting Up Your SharePoint Lists

### Clients List
Create a SharePoint list named "Clients" with these columns:
- **Title** (default) - Client name
- Email (single line of text) - Contact email
- Contact (single line of text) - Contact person name

### Discounts List
Create a SharePoint list named "Discounts" with these columns:
- **Title** (default) - Discount name (e.g., "Volume Discount", "Q1 2025")
- Value (number) - Discount percentage (e.g., 5, 10, 15)

## How It Works

1. The Rate Calculator component fetches clients and discounts from SharePoint via the API
2. The backend uses Microsoft Graph API to query the SharePoint lists
3. Data is cached and automatically refreshed when the page loads
4. Users can manually enter a discount % or select from predefined discounts

## Testing

Test the connection with:
```bash
curl http://localhost:5000/api/rate-calculator/clients
curl http://localhost:5000/api/rate-calculator/discounts
```

Note: These endpoints require authentication (JWT token in Authorization header)

## Troubleshooting

- **401 Unauthorized**: Check that your access token is valid and not expired
- **404 Not Found**: Verify SharePoint Site ID and List IDs are correct
- **Empty arrays**: Check that your SharePoint lists have data and proper column names
- **Graph API errors**: Review Microsoft Graph API permissions on your app registration

# Bulk Email Tool

A full-stack application for sending personalized bulk emails through Microsoft 365/Outlook with tracking, analytics, and compliance features.

## 🚀 Features

### Core Functionality
- **Microsoft 365 Integration**: Seamless OAuth2 authentication with Azure AD
- **Contact Management**: Sync contacts from Outlook or import via CSV
- **Template Engine**: Create reusable email templates with dynamic placeholders
- **Bulk Sending**: Queue-based system for reliable mass email delivery
- **Tracking & Analytics**: Monitor open rates, click rates, and engagement
- **Compliance**: GDPR/CCPA compliant with audit logging and unsubscribe management

### Key Capabilities
- ✅ Sync contacts directly from Outlook
- ✅ Personalized email templates with `{{placeholders}}`
- ✅ Batch sending (50-100 emails per batch) to avoid spam filters
- ✅ Real-time campaign tracking and analytics
- ✅ Dashboard with engagement metrics
- ✅ Audit trail for all email sends
- ✅ Responsive web interface

## 📋 Prerequisites

- **Node.js** 18+ and npm
- **Azure Subscription** with:
  - Azure SQL Database
  - Azure Storage Account (for queue)
  - Azure AD tenant
- **Microsoft 365** account with appropriate permissions
- **Git** for version control

## 🏗️ Architecture

```
┌─────────────┐         ┌─────────────┐         ┌──────────────┐
│   React     │ ◄─────► │   Express   │ ◄─────► │  Azure SQL   │
│   Frontend  │         │   Backend   │         │   Database   │
└─────────────┘         └─────────────┘         └──────────────┘
                              │
                              ├─────► Microsoft Graph API
                              │
                              └─────► Azure Queue Storage
```

### Tech Stack

**Frontend:**
- React 18
- Vite (build tool)
- React Router 7
- Axios for API calls
- Azure MSAL for authentication

**Backend:**
- Node.js with Express
- Microsoft Graph SDK
- Azure Storage Queue
- SQL Server (mssql) driver
- Winston for logging

**Database:**
- Azure SQL Database

**Authentication:**
- Azure AD OAuth2

## 📦 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/bulkemailtool.git
cd bulkemailtool
```

### 2. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your Azure credentials
```

### 3. Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
# Edit .env with your Azure credentials
```

### 4. Database Setup

Follow the instructions in [`database/README.md`](database/README.md) to:
1. Create Azure SQL Database
2. Run schema scripts
3. (Optional) Load sample data

### 5. Azure AD Configuration

Follow the detailed guide in [`docs/azure-ad-setup.md`](docs/azure-ad-setup.md) to:
1. Register application in Azure AD
2. Configure API permissions
3. Create client secret
4. Set up redirect URIs

## 🔧 Configuration

### Backend Environment Variables

Create `backend/.env`:

```env
# Server
PORT=5000
NODE_ENV=development

# Azure AD
AZURE_CLIENT_ID=your-client-id
AZURE_CLIENT_SECRET=your-client-secret
AZURE_TENANT_ID=your-tenant-id
REDIRECT_URI=http://localhost:3000/auth/callback

# Database
DB_SERVER=your-server.database.windows.net
DB_DATABASE=BulkEmailTool
DB_USER=sqladmin
DB_PASSWORD=your-password
DB_ENCRYPT=true

# Azure Queue Storage
AZURE_STORAGE_CONNECTION_STRING=your-connection-string

# App Settings
JWT_SECRET=your-jwt-secret
BATCH_SIZE=50
MAX_EMAILS_PER_DAY=500
SEND_DELAY_MS=2000

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

### Frontend Environment Variables

Create `frontend/.env`:

```env
VITE_API_URL=http://localhost:5000/api
VITE_AZURE_CLIENT_ID=your-client-id
VITE_AZURE_TENANT_ID=your-tenant-id
VITE_REDIRECT_URI=http://localhost:3000/auth/callback
```

## 🚀 Running the Application

### Development Mode

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

### Production Build

**Backend:**
```bash
cd backend
npm start
```

**Frontend:**
```bash
cd frontend
npm run build
# Serve the build folder with a static server
```

## 📖 Usage Guide

### 1. Authentication

1. Navigate to http://localhost:3000
2. Click "Sign in with Microsoft"
3. Authenticate with your Microsoft 365 account
4. Grant requested permissions

### 2. Manage Contacts

- **Sync from Outlook**: Click "Sync from Outlook" to import your contacts
- **Add Manually**: Click "Add Contact" to create new contacts
- **Import CSV**: Use the import feature for bulk contact uploads
- **Organize**: Tag contacts for easy segmentation

### 3. Create Email Templates

1. Go to "Templates" page
2. Click "Create Template"
3. Enter template name and subject
4. Write email body using placeholders:
   - `{{FirstName}}` - Contact's first name
   - `{{LastName}}` - Contact's last name
   - `{{Email}}` - Contact's email
   - `{{Company}}` - Contact's company
   - `{{JobTitle}}` - Contact's job title
5. Preview with sample data
6. Save template

**Example Template:**

```html
<html>
<body>
  <p>Hi {{FirstName}},</p>
  
  <p>I wanted to reach out regarding {{Company}}'s needs for our services.</p>
  
  <p>As a {{JobTitle}}, I believe you'll find value in our solution.</p>
  
  <p>Best regards,<br>Your Name</p>
</body>
</html>
```

### 4. Create and Send Campaigns

1. Go to "Campaigns" page
2. Click "New Campaign"
3. Enter campaign name
4. Select email template
5. Select target contacts (or select all)
6. Review campaign details
7. Click "Send" to queue emails

### 5. Monitor Analytics

- **Dashboard**: View overall statistics
- **Campaign Details**: Click on a campaign to see:
  - Total sent
  - Open rate
  - Click rate
  - Individual recipient status
  - Send logs

## 🏢 Deployment to Azure

### Option 1: Azure App Service

**Backend Deployment:**

```bash
# Create App Service
az webapp create \
  --name bulkemailtool-api \
  --resource-group BulkEmailTool-RG \
  --plan BulkEmailTool-Plan \
  --runtime "NODE:18-lts"

# Configure app settings
az webapp config appsettings set \
  --name bulkemailtool-api \
  --resource-group BulkEmailTool-RG \
  --settings @appsettings.json

# Deploy code
cd backend
zip -r deploy.zip .
az webapp deployment source config-zip \
  --name bulkemailtool-api \
  --resource-group BulkEmailTool-RG \
  --src deploy.zip
```

**Frontend Deployment:**

```bash
# Build frontend
cd frontend
npm run build

# Deploy to Azure Static Web Apps
az staticwebapp create \
  --name bulkemailtool-web \
  --resource-group BulkEmailTool-RG \
  --source ./build \
  --location eastus
```

### Option 2: Container Deployment

Create `Dockerfile` for backend and deploy to Azure Container Apps or AKS.

## 🔒 Security Considerations

### Authentication
- OAuth2 with Azure AD
- Token-based API authentication
- Secure token storage
- Automatic token refresh

### Data Protection
- Encrypted database connections
- Environment variable secrets
- HTTPS-only in production
- Rate limiting on API endpoints

### Compliance
- Audit logging for all actions
- Unsubscribe mechanism
- GDPR data export capability
- Consent management

### Best Practices
- Validate all inputs
- Sanitize email content
- Respect Microsoft Graph API rate limits
- Implement proper error handling
- Monitor for suspicious activity

## 📊 API Documentation

### Authentication Endpoints

```
POST /api/auth/login        - Initiate OAuth2 flow
POST /api/auth/callback     - Handle OAuth2 callback
POST /api/auth/refresh      - Refresh access token
GET  /api/auth/me           - Get current user profile
```

### Contact Endpoints

```
GET    /api/contacts        - Get all contacts
POST   /api/contacts        - Create new contact
POST   /api/contacts/sync   - Sync from Outlook
PUT    /api/contacts/:id    - Update contact
DELETE /api/contacts/:id    - Delete contact
POST   /api/contacts/import - Import from CSV
```

### Template Endpoints

```
GET    /api/templates       - Get all templates
GET    /api/templates/:id   - Get template by ID
POST   /api/templates       - Create template
PUT    /api/templates/:id   - Update template
DELETE /api/templates/:id   - Delete template
POST   /api/templates/:id/preview - Preview template
```

### Campaign Endpoints

```
GET    /api/campaigns       - Get all campaigns
GET    /api/campaigns/:id   - Get campaign details
POST   /api/campaigns       - Create campaign
POST   /api/campaigns/:id/send - Send campaign
GET    /api/campaigns/:id/logs - Get campaign logs
DELETE /api/campaigns/:id   - Delete campaign
```

### Analytics Endpoints

```
GET    /api/analytics/dashboard     - Overall statistics
GET    /api/analytics/campaign/:id  - Campaign analytics
GET    /api/analytics/track/:id     - Track email open (pixel)
POST   /api/analytics/click         - Track link click
```

## 🧪 Testing

### Backend Tests

```bash
cd backend
npm test
```

### Frontend Tests

```bash
cd frontend
npm test
```

### Manual Testing Checklist

- [ ] User can authenticate with Microsoft 365
- [ ] Contacts sync from Outlook successfully
- [ ] Templates can be created and saved
- [ ] Campaigns can be created and sent
- [ ] Email tracking works (opens and clicks)
- [ ] Analytics dashboard displays correct data
- [ ] Unsubscribe functionality works
- [ ] Error handling works properly

## 🐛 Troubleshooting

### Common Issues

**Authentication fails:**
- Verify Azure AD app registration settings
- Check redirect URI matches exactly
- Ensure API permissions are granted
- Verify client secret is correct

**Database connection fails:**
- Check firewall rules allow your IP
- Verify connection string
- Ensure database exists
- Check credentials

**Emails not sending:**
- Verify Microsoft Graph API permissions
- Check queue service connection
- Review batch size settings
- Monitor rate limits

**Frontend can't connect to backend:**
- Verify CORS settings
- Check API URL in frontend `.env`
- Ensure backend is running
- Check firewall/network settings

### Debug Mode

Enable detailed logging:

```env
# Backend
LOG_LEVEL=debug
NODE_ENV=development

# Frontend
REACT_APP_DEBUG=true
```

## 📈 Performance Optimization

- **Batching**: Emails sent in configurable batches (default: 50)
- **Delay**: Configurable delay between batches (default: 2s)
- **Caching**: Implement Redis for session/token caching
- **CDN**: Use Azure CDN for frontend static assets
- **Database**: Add indexes on frequently queried columns
- **Connection Pooling**: Configured in database connection

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Microsoft Graph API documentation
- Azure documentation and samples
- React and Express communities

## 📞 Support

For issues and questions:
- Create an issue in the GitHub repository
- Contact: your-email@example.com

## 🗺️ Roadmap

### Version 1.1
- [ ] A/B testing for email templates
- [ ] Scheduled campaign sending
- [ ] Advanced segmentation filters
- [ ] Email template marketplace

### Version 1.2
- [ ] Machine learning for send time optimization
- [ ] Predictive engagement scoring
- [ ] Multi-language support
- [ ] Mobile app (React Native)

### Version 2.0
- [ ] WhatsApp integration
- [ ] SMS campaigns
- [ ] Social media posting
- [ ] Full CRM capabilities

---

**Built with ❤️ using Microsoft 365, Azure, and modern web technologies**

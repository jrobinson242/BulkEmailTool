# Database Setup Guide

## Prerequisites
- Azure SQL Database instance
- SQL Server Management Studio (SSMS) or Azure Data Studio
- Access to Azure Portal

## Setup Instructions

### 1. Create Azure SQL Database

```bash
# Using Azure CLI
az sql server create \
  --name bulkemailtool-sql \
  --resource-group BulkEmailTool-RG \
  --location eastus \
  --admin-user sqladmin \
  --admin-password YourSecurePassword123!

az sql db create \
  --resource-group BulkEmailTool-RG \
  --server bulkemailtool-sql \
  --name BulkEmailTool \
  --service-objective S0
```

### 2. Configure Firewall Rules

Allow your IP address and Azure services to access the database:

```bash
az sql server firewall-rule create \
  --resource-group BulkEmailTool-RG \
  --server bulkemailtool-sql \
  --name AllowAzureServices \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0

az sql server firewall-rule create \
  --resource-group BulkEmailTool-RG \
  --server bulkemailtool-sql \
  --name AllowMyIP \
  --start-ip-address YOUR_IP_ADDRESS \
  --end-ip-address YOUR_IP_ADDRESS
```

### 3. Run Schema Script

Connect to your database using SSMS or Azure Data Studio and run:

```sql
-- Execute the schema.sql file
-- This creates all tables, indexes, and relationships
```

### 4. (Optional) Load Sample Data

For testing purposes, run the seed data script:

```sql
-- Execute the seed-data.sql file
-- This creates test users, contacts, templates, and campaigns
```

### 5. Update Backend Configuration

Update your backend `.env` file with the database connection details:

```env
DB_SERVER=bulkemailtool-sql.database.windows.net
DB_DATABASE=BulkEmailTool
DB_USER=sqladmin
DB_PASSWORD=YourSecurePassword123!
DB_ENCRYPT=true
```

## Database Schema Overview

### Core Tables

- **Users**: Stores user information from Azure AD
- **Contacts**: Email recipients with metadata
- **Templates**: Reusable email templates with placeholders
- **Campaigns**: Email campaign configurations
- **CampaignContacts**: Links contacts to campaigns (many-to-many)
- **CampaignLogs**: Tracks individual email sends and engagement
- **AuditLogs**: Compliance and security auditing
- **Unsubscribes**: GDPR/CCPA opt-out management

### Key Relationships

```
Users (1) ─── (many) Contacts
Users (1) ─── (many) Templates
Users (1) ─── (many) Campaigns
Templates (1) ─── (many) Campaigns
Campaigns (many) ─── (many) Contacts (via CampaignContacts)
Campaigns (1) ─── (many) CampaignLogs
Contacts (1) ─── (many) CampaignLogs
```

## Maintenance

### Backup Strategy

Azure SQL Database provides automatic backups. Configure long-term retention if needed:

```bash
az sql db ltr-policy set \
  --resource-group BulkEmailTool-RG \
  --server bulkemailtool-sql \
  --database BulkEmailTool \
  --weekly-retention P4W \
  --monthly-retention P12M
```

### Performance Monitoring

Monitor query performance using Azure Portal's Query Performance Insight feature.

### Clean Up Old Logs

Consider implementing a cleanup job for old campaign logs:

```sql
-- Delete logs older than 90 days
DELETE FROM CampaignLogs
WHERE CreatedAt < DATEADD(day, -90, GETDATE());
```

## Security Best Practices

1. Use Azure AD authentication when possible
2. Enable Transparent Data Encryption (TDE)
3. Configure Advanced Threat Protection
4. Regularly review audit logs
5. Implement row-level security for multi-tenant scenarios
6. Use managed identities for application connections

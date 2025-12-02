# Deployment Guide - BulkEmailTool

## Overview

This guide covers deploying the BulkEmailTool application to Microsoft Azure using various deployment strategies.

## Prerequisites

- Azure CLI installed and configured
- Azure subscription with appropriate permissions
- Domain name (optional, for production)
- SSL certificate (optional, Azure can provide)

## Deployment Architecture

```
Internet
   ↓
Azure Front Door (Optional CDN)
   ↓
   ├─→ Static Web App (Frontend)
   │
   └─→ App Service (Backend API)
         ↓
         ├─→ Azure SQL Database
         ├─→ Azure Queue Storage
         └─→ Azure AD (Authentication)
```

## Option 1: Azure App Service (Recommended for MVP)

### Step 1: Create Resource Group

```bash
az group create \
  --name BulkEmailTool-RG \
  --location eastus
```

### Step 2: Create App Service Plan

```bash
az appservice plan create \
  --name BulkEmailTool-Plan \
  --resource-group BulkEmailTool-RG \
  --sku B1 \
  --is-linux
```

### Step 3: Deploy Backend

```bash
# Create Web App for Backend
az webapp create \
  --name bulkemailtool-api \
  --resource-group BulkEmailTool-RG \
  --plan BulkEmailTool-Plan \
  --runtime "NODE:18-lts"

# Configure app settings
az webapp config appsettings set \
  --name bulkemailtool-api \
  --resource-group BulkEmailTool-RG \
  --settings \
    NODE_ENV=production \
    AZURE_CLIENT_ID="your-client-id" \
    AZURE_CLIENT_SECRET="@Microsoft.KeyVault(SecretUri=https://your-vault.vault.azure.net/secrets/ClientSecret/)" \
    AZURE_TENANT_ID="your-tenant-id" \
    DB_SERVER="your-sql-server.database.windows.net" \
    DB_DATABASE="BulkEmailTool" \
    DB_USER="@Microsoft.KeyVault(SecretUri=https://your-vault.vault.azure.net/secrets/DBUser/)" \
    DB_PASSWORD="@Microsoft.KeyVault(SecretUri=https://your-vault.vault.azure.net/secrets/DBPassword/)" \
    AZURE_STORAGE_CONNECTION_STRING="@Microsoft.KeyVault(SecretUri=https://your-vault.vault.azure.net/secrets/StorageConnection/)" \
    FRONTEND_URL="https://bulkemailtool-web.azurestaticapps.net"

# Deploy code
cd backend
zip -r ../backend-deploy.zip .
az webapp deployment source config-zip \
  --name bulkemailtool-api \
  --resource-group BulkEmailTool-RG \
  --src ../backend-deploy.zip
```

### Step 4: Deploy Frontend to Static Web App

```bash
# Install Azure Static Web Apps CLI
npm install -g @azure/static-web-apps-cli

# Build frontend
cd frontend
npm run build

# Create Static Web App
az staticwebapp create \
  --name bulkemailtool-web \
  --resource-group BulkEmailTool-RG \
  --source ./build \
  --location eastus \
  --branch main \
  --app-location "frontend" \
  --output-location "build"

# Update frontend environment variables
# Go to Azure Portal > Static Web App > Configuration
# Add:
# REACT_APP_API_URL=https://bulkemailtool-api.azurewebsites.net/api
```

## Option 2: Container Deployment (Azure Container Apps)

### Step 1: Create Container Registry

```bash
az acr create \
  --resource-group BulkEmailTool-RG \
  --name bulkemailtoolacr \
  --sku Basic
```

### Step 2: Build and Push Backend Container

Create `backend/Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 5000

CMD ["node", "src/server.js"]
```

```bash
cd backend

# Build and push
az acr build \
  --registry bulkemailtoolacr \
  --image bulkemailtool-api:latest \
  --file Dockerfile .
```

### Step 3: Deploy to Container Apps

```bash
# Create Container Apps environment
az containerapp env create \
  --name bulkemailtool-env \
  --resource-group BulkEmailTool-RG \
  --location eastus

# Deploy container
az containerapp create \
  --name bulkemailtool-api \
  --resource-group BulkEmailTool-RG \
  --environment bulkemailtool-env \
  --image bulkemailtoolacr.azurecr.io/bulkemailtool-api:latest \
  --target-port 5000 \
  --ingress 'external' \
  --registry-server bulkemailtoolacr.azurecr.io \
  --env-vars \
    NODE_ENV=production \
    AZURE_CLIENT_ID=secretref:azure-client-id
```

## Database Setup

### Create Azure SQL Database

```bash
# Create SQL Server
az sql server create \
  --name bulkemailtool-sql \
  --resource-group BulkEmailTool-RG \
  --location eastus \
  --admin-user sqladmin \
  --admin-password "YourSecurePassword123!"

# Create database
az sql db create \
  --resource-group BulkEmailTool-RG \
  --server bulkemailtool-sql \
  --name BulkEmailTool \
  --service-objective S0

# Configure firewall
az sql server firewall-rule create \
  --resource-group BulkEmailTool-RG \
  --server bulkemailtool-sql \
  --name AllowAzureServices \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0
```

### Run Database Migrations

```bash
# Connect to database using Azure Data Studio or SSMS
# Run the schema.sql script from database folder
```

## Storage Setup

### Create Storage Account for Queue

```bash
az storage account create \
  --name bulkemailtoolstorage \
  --resource-group BulkEmailTool-RG \
  --location eastus \
  --sku Standard_LRS

# Get connection string
az storage account show-connection-string \
  --name bulkemailtoolstorage \
  --resource-group BulkEmailTool-RG \
  --output tsv
```

## Security Configuration

### Set Up Key Vault

```bash
# Create Key Vault
az keyvault create \
  --name bulkemailtool-kv \
  --resource-group BulkEmailTool-RG \
  --location eastus

# Add secrets
az keyvault secret set \
  --vault-name bulkemailtool-kv \
  --name ClientSecret \
  --value "your-azure-ad-client-secret"

az keyvault secret set \
  --vault-name bulkemailtool-kv \
  --name DBPassword \
  --value "your-database-password"

az keyvault secret set \
  --vault-name bulkemailtool-kv \
  --name StorageConnection \
  --value "your-storage-connection-string"
```

### Enable Managed Identity

```bash
# Enable system-assigned identity for App Service
az webapp identity assign \
  --name bulkemailtool-api \
  --resource-group BulkEmailTool-RG

# Grant Key Vault access
az keyvault set-policy \
  --name bulkemailtool-kv \
  --object-id <app-service-identity-id> \
  --secret-permissions get list
```

## Custom Domain Configuration

### Add Custom Domain

```bash
# For App Service
az webapp config hostname add \
  --webapp-name bulkemailtool-api \
  --resource-group BulkEmailTool-RG \
  --hostname api.yourdomain.com

# For Static Web App
az staticwebapp hostname set \
  --name bulkemailtool-web \
  --resource-group BulkEmailTool-RG \
  --hostname www.yourdomain.com
```

### Enable SSL

```bash
# App Service (Free managed certificate)
az webapp config ssl bind \
  --name bulkemailtool-api \
  --resource-group BulkEmailTool-RG \
  --certificate-thumbprint auto \
  --ssl-type SNI
```

## Monitoring and Logging

### Enable Application Insights

```bash
# Create Application Insights
az monitor app-insights component create \
  --app bulkemailtool-insights \
  --location eastus \
  --resource-group BulkEmailTool-RG

# Link to App Service
az webapp config appsettings set \
  --name bulkemailtool-api \
  --resource-group BulkEmailTool-RG \
  --settings APPINSIGHTS_INSTRUMENTATIONKEY="your-instrumentation-key"
```

### Configure Log Analytics

```bash
# Create Log Analytics Workspace
az monitor log-analytics workspace create \
  --resource-group BulkEmailTool-RG \
  --workspace-name bulkemailtool-logs
```

## CI/CD with GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Azure

on:
  push:
    branches: [ main ]

jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: cd backend && npm ci
      
      - name: Deploy to Azure Web App
        uses: azure/webapps-deploy@v2
        with:
          app-name: bulkemailtool-api
          publish-profile: ${{ secrets.AZURE_WEBAPP_PUBLISH_PROFILE }}
          package: backend

  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - name: Build
        run: cd frontend && npm ci && npm run build
      
      - name: Deploy to Static Web App
        uses: Azure/static-web-apps-deploy@v1
        with:
          azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}
          repo_token: ${{ secrets.GITHUB_TOKEN }}
          action: "upload"
          app_location: "frontend"
          output_location: "build"
```

## Post-Deployment Steps

### 1. Update Azure AD Redirect URIs

Add production URLs to your Azure AD app registration:
- `https://yourdomain.com/auth/callback`
- `https://bulkemailtool-web.azurestaticapps.net/auth/callback`

### 2. Verify Database Connectivity

Test connection from App Service to Azure SQL.

### 3. Test Authentication Flow

Ensure OAuth flow works with production URLs.

### 4. Load Test

Use Azure Load Testing to verify performance:

```bash
az load test create \
  --name bulkemailtool-loadtest \
  --resource-group BulkEmailTool-RG
```

### 5. Set Up Alerts

Create alerts for:
- High CPU usage
- Database connection failures
- API error rates
- Email send failures

## Scaling Configuration

### Auto-scaling Rules

```bash
az monitor autoscale create \
  --resource-group BulkEmailTool-RG \
  --resource bulkemailtool-api \
  --resource-type Microsoft.Web/serverfarms \
  --name autoscale-plan \
  --min-count 1 \
  --max-count 5 \
  --count 1

az monitor autoscale rule create \
  --resource-group BulkEmailTool-RG \
  --autoscale-name autoscale-plan \
  --condition "CpuPercentage > 70 avg 5m" \
  --scale out 1
```

## Backup Strategy

### Database Backups

```bash
# Enable long-term retention
az sql db ltr-policy set \
  --resource-group BulkEmailTool-RG \
  --server bulkemailtool-sql \
  --database BulkEmailTool \
  --weekly-retention P4W \
  --monthly-retention P12M \
  --yearly-retention P5Y \
  --week-of-year 1
```

### Storage Backups

Enable soft delete and versioning for Storage Account.

## Cost Optimization

### Recommended SKUs for Production

- **App Service**: P1V2 ($73/month)
- **SQL Database**: S1 ($30/month)
- **Storage**: Standard LRS ($20/month)
- **Static Web App**: Free tier
- **Total**: ~$125/month

### Cost Saving Tips

1. Use reserved instances for predictable workloads
2. Enable auto-shutdown for non-production resources
3. Monitor and optimize database DTU usage
4. Use Azure Cost Management alerts

## Troubleshooting

### Common Deployment Issues

**App Service not starting:**
- Check logs: `az webapp log tail --name bulkemailtool-api --resource-group BulkEmailTool-RG`
- Verify environment variables
- Check Node.js version

**Database connection issues:**
- Verify firewall rules
- Check connection string
- Ensure managed identity has access

**Static Web App not updating:**
- Verify GitHub Actions workflow
- Check build logs
- Clear CDN cache

## Rollback Procedure

```bash
# List deployment slots
az webapp deployment slot list \
  --name bulkemailtool-api \
  --resource-group BulkEmailTool-RG

# Swap to previous version
az webapp deployment slot swap \
  --name bulkemailtool-api \
  --resource-group BulkEmailTool-RG \
  --slot staging \
  --target-slot production
```

## Support

For deployment issues:
- Check Azure Portal resource health
- Review Application Insights logs
- Contact Azure Support if needed

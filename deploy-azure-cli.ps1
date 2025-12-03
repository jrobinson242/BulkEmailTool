# Azure Deployment Script - Using Azure CLI
# Run this script after setting the variables below

# ============== CONFIGURATION ==============
$resourceGroup = "bulk-email-tool-rg"
$location = "eastus"
$appServicePlan = "bulk-email-plan"
$backendAppName = "bulk-email-backend-test"  # Must be globally unique
$staticWebAppName = "bulk-email-frontend-test"  # Must be globally unique

# Database Configuration
$dbServer = "your-server.database.windows.net"
$dbName = "BulkEmailTool"
$dbUser = "your-username"
$dbPassword = "your-password"

# Azure AD Configuration
$azureClientId = "your-client-id"
$azureClientSecret = "your-client-secret"
$azureTenantId = "your-tenant-id"

# Storage Configuration
$storageConnectionString = "your-storage-connection-string"
$queueName = "email-queue"

# JWT Secret
$jwtSecret = "your-jwt-secret-key"

# ============================================

Write-Host "Starting Azure deployment..." -ForegroundColor Green

# Login to Azure
Write-Host "`nStep 1: Logging in to Azure..." -ForegroundColor Yellow
az login

# Set subscription (if you have multiple)
# az account set --subscription "your-subscription-id"

# Create resource group
Write-Host "`nStep 2: Creating resource group..." -ForegroundColor Yellow
az group create `
  --name $resourceGroup `
  --location $location

# Create App Service Plan
Write-Host "`nStep 3: Creating App Service Plan..." -ForegroundColor Yellow
az appservice plan create `
  --name $appServicePlan `
  --resource-group $resourceGroup `
  --sku B1 `
  --is-linux

# Create Backend App Service
Write-Host "`nStep 4: Creating Backend App Service..." -ForegroundColor Yellow
az webapp create `
  --name $backendAppName `
  --resource-group $resourceGroup `
  --plan $appServicePlan `
  --runtime "NODE:18-lts"

# Configure Backend App Settings
Write-Host "`nStep 5: Configuring Backend environment variables..." -ForegroundColor Yellow
az webapp config appsettings set `
  --name $backendAppName `
  --resource-group $resourceGroup `
  --settings `
    DB_SERVER=$dbServer `
    DB_NAME=$dbName `
    DB_USER=$dbUser `
    DB_PASSWORD=$dbPassword `
    JWT_SECRET=$jwtSecret `
    AZURE_CLIENT_ID=$azureClientId `
    AZURE_CLIENT_SECRET=$azureClientSecret `
    AZURE_TENANT_ID=$azureTenantId `
    AZURE_STORAGE_CONNECTION_STRING=$storageConnectionString `
    QUEUE_NAME=$queueName `
    PORT=8080 `
    NODE_ENV=production

# Enable CORS
Write-Host "`nStep 6: Configuring CORS..." -ForegroundColor Yellow
az webapp cors add `
  --name $backendAppName `
  --resource-group $resourceGroup `
  --allowed-origins "https://$staticWebAppName.azurestaticapps.net"

az webapp cors add `
  --name $backendAppName `
  --resource-group $resourceGroup `
  --allowed-origins "http://localhost:3000"

# Deploy Backend Code
Write-Host "`nStep 7: Deploying Backend code..." -ForegroundColor Yellow
Write-Host "Building backend..." -ForegroundColor Cyan
cd backend
npm install --production

Write-Host "Creating deployment package..." -ForegroundColor Cyan
Compress-Archive -Path * -DestinationPath ../backend-deploy.zip -Force

cd ..
Write-Host "Deploying to Azure..." -ForegroundColor Cyan
az webapp deployment source config-zip `
  --name $backendAppName `
  --resource-group $resourceGroup `
  --src backend-deploy.zip

# Create Static Web App for Frontend
Write-Host "`nStep 8: Creating Static Web App for Frontend..." -ForegroundColor Yellow
Write-Host "Note: This requires GitHub integration. You'll be prompted to authenticate." -ForegroundColor Cyan

az staticwebapp create `
  --name $staticWebAppName `
  --resource-group $resourceGroup `
  --source https://github.com/jrobinson242/BulkEmailTool `
  --location "eastus2" `
  --branch master `
  --app-location "/frontend" `
  --output-location "build" `
  --login-with-github

# Get Backend URL
$backendUrl = az webapp show `
  --name $backendAppName `
  --resource-group $resourceGroup `
  --query defaultHostName `
  --output tsv

$backendUrl = "https://$backendUrl"

# Configure Frontend Environment Variables
Write-Host "`nStep 9: Configuring Frontend environment variables..." -ForegroundColor Yellow
az staticwebapp appsettings set `
  --name $staticWebAppName `
  --resource-group $resourceGroup `
  --setting-names REACT_APP_API_URL=$backendUrl

# Get Frontend URL
$frontendUrl = az staticwebapp show `
  --name $staticWebAppName `
  --resource-group $resourceGroup `
  --query defaultHostname `
  --output tsv

$frontendUrl = "https://$frontendUrl"

# Update Backend with Frontend URL
Write-Host "`nStep 10: Updating Backend with Frontend URL..." -ForegroundColor Yellow
az webapp config appsettings set `
  --name $backendAppName `
  --resource-group $resourceGroup `
  --settings FRONTEND_URL=$frontendUrl

# Enable Application Insights (Optional but recommended)
Write-Host "`nStep 11: Setting up Application Insights..." -ForegroundColor Yellow
az monitor app-insights component create `
  --app $backendAppName-insights `
  --location $location `
  --resource-group $resourceGroup `
  --application-type web

$instrumentationKey = az monitor app-insights component show `
  --app $backendAppName-insights `
  --resource-group $resourceGroup `
  --query instrumentationKey `
  --output tsv

az webapp config appsettings set `
  --name $backendAppName `
  --resource-group $resourceGroup `
  --settings APPINSIGHTS_INSTRUMENTATIONKEY=$instrumentationKey

# Cleanup
Write-Host "`nCleaning up deployment files..." -ForegroundColor Yellow
Remove-Item backend-deploy.zip -ErrorAction SilentlyContinue

# Summary
Write-Host "`n============================================" -ForegroundColor Green
Write-Host "Deployment Complete!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Backend URL: $backendUrl" -ForegroundColor Cyan
Write-Host "Frontend URL: $frontendUrl" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Update Azure AD redirect URIs to include: $frontendUrl"
Write-Host "2. Test the application at: $frontendUrl"
Write-Host "3. Check logs at: https://portal.azure.com"
Write-Host "4. Monitor with Application Insights"
Write-Host ""
Write-Host "To view backend logs:" -ForegroundColor Cyan
Write-Host "  az webapp log tail --name $backendAppName --resource-group $resourceGroup"
Write-Host ""

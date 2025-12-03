# Azure SQL Database Setup Guide

## Prerequisites

### Install Azure CLI

**Windows (PowerShell as Administrator):**
```powershell
# Download and install Azure CLI
Invoke-WebRequest -Uri https://aka.ms/installazurecliwindows -OutFile .\AzureCLI.msi
Start-Process msiexec.exe -Wait -ArgumentList '/I AzureCLI.msi /quiet'
Remove-Item .\AzureCLI.msi
```

**Or using winget:**
```powershell
winget install -e --id Microsoft.AzureCLI
```

**After installation, close and reopen PowerShell**, then verify:
```powershell
az --version
```

## Step 1: Login to Azure

```powershell
az login
```

This will open a browser window for you to authenticate. After login:

```powershell
# List your subscriptions
az account list --output table

# Set the subscription you want to use (if you have multiple)
az account set --subscription "Your-Subscription-Name-or-ID"
```

## Step 2: Set Variables

```powershell
# Set your configuration variables
$RESOURCE_GROUP = "BulkEmailTool-RG"
$LOCATION = "eastus"  # Change to your preferred region
$SQL_SERVER_NAME = "bulkemailtool-sql-$(Get-Random -Maximum 9999)"  # Must be globally unique
$SQL_DATABASE_NAME = "BulkEmailTool"
$ADMIN_USER = "sqladmin"
$ADMIN_PASSWORD = "YourSecureP@ssw0rd123!"  # Change this to a strong password

# Display the values
Write-Host "Resource Group: $RESOURCE_GROUP" -ForegroundColor Cyan
Write-Host "SQL Server: $SQL_SERVER_NAME" -ForegroundColor Cyan
Write-Host "Database: $SQL_DATABASE_NAME" -ForegroundColor Cyan
Write-Host "Location: $LOCATION" -ForegroundColor Cyan
```

## Step 3: Create Resource Group

```powershell
az group create `
  --name $RESOURCE_GROUP `
  --location $LOCATION

Write-Host "Resource group created successfully!" -ForegroundColor Green
```

## Step 4: Create SQL Server

```powershell
az sql server create `
  --name $SQL_SERVER_NAME `
  --resource-group $RESOURCE_GROUP `
  --location $LOCATION `
  --admin-user $ADMIN_USER `
  --admin-password $ADMIN_PASSWORD

Write-Host "SQL Server created successfully!" -ForegroundColor Green
```

## Step 5: Configure Firewall Rules

```powershell
# Allow Azure services to access the server
az sql server firewall-rule create `
  --resource-group $RESOURCE_GROUP `
  --server $SQL_SERVER_NAME `
  --name AllowAzureServices `
  --start-ip-address 0.0.0.0 `
  --end-ip-address 0.0.0.0

# Get your current public IP
$MY_IP = (Invoke-WebRequest -Uri "https://api.ipify.org" -UseBasicParsing).Content
Write-Host "Your public IP: $MY_IP" -ForegroundColor Yellow

# Allow your local machine to access the server
az sql server firewall-rule create `
  --resource-group $RESOURCE_GROUP `
  --server $SQL_SERVER_NAME `
  --name AllowMyIP `
  --start-ip-address $MY_IP `
  --end-ip-address $MY_IP

Write-Host "Firewall rules configured successfully!" -ForegroundColor Green
```

## Step 6: Create SQL Database

```powershell
# Create database (Basic tier for development)
az sql db create `
  --resource-group $RESOURCE_GROUP `
  --server $SQL_SERVER_NAME `
  --name $SQL_DATABASE_NAME `
  --service-objective Basic `
  --backup-storage-redundancy Local

Write-Host "Database created successfully!" -ForegroundColor Green
```

## Step 7: Get Connection String

```powershell
# Get the connection string
$CONNECTION_STRING = az sql db show-connection-string `
  --client ado.net `
  --server $SQL_SERVER_NAME `
  --name $SQL_DATABASE_NAME `
  --output tsv

# Replace placeholders
$CONNECTION_STRING = $CONNECTION_STRING.Replace("<username>", $ADMIN_USER)
$CONNECTION_STRING = $CONNECTION_STRING.Replace("<password>", $ADMIN_PASSWORD)

Write-Host "`nConnection String:" -ForegroundColor Cyan
Write-Host $CONNECTION_STRING -ForegroundColor Yellow

# Display individual components for .env file
Write-Host "`nFor your .env file:" -ForegroundColor Cyan
Write-Host "DB_SERVER=$SQL_SERVER_NAME.database.windows.net" -ForegroundColor Green
Write-Host "DB_DATABASE=$SQL_DATABASE_NAME" -ForegroundColor Green
Write-Host "DB_USER=$ADMIN_USER" -ForegroundColor Green
Write-Host "DB_PASSWORD=$ADMIN_PASSWORD" -ForegroundColor Green
Write-Host "DB_ENCRYPT=true" -ForegroundColor Green
```

## Step 8: Install SQL Tools and Run Schema

### Option A: Using Azure Data Studio (Recommended)

1. Download and install [Azure Data Studio](https://docs.microsoft.com/sql/azure-data-studio/download)
2. Open Azure Data Studio
3. Click "New Connection"
4. Enter:
   - **Server**: `[your-server-name].database.windows.net`
   - **Authentication**: SQL Login
   - **User name**: `sqladmin`
   - **Password**: Your password
   - **Database**: `BulkEmailTool`
5. Click "Connect"
6. Open `database/schema.sql`
7. Click "Run" to execute the schema

### Option B: Using sqlcmd (Command Line)

Install sqlcmd:
```powershell
# Using winget
winget install Microsoft.SQLCmd

# Or download from: https://aka.ms/sqlcmd
```

Run the schema:
```powershell
sqlcmd -S "$SQL_SERVER_NAME.database.windows.net" `
  -d $SQL_DATABASE_NAME `
  -U $ADMIN_USER `
  -P $ADMIN_PASSWORD `
  -i "database\schema.sql"

Write-Host "Schema created successfully!" -ForegroundColor Green
```

### Option C: Using Azure Portal Query Editor

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to your SQL Database
3. Click "Query editor" in the left menu
4. Login with SQL authentication
5. Paste the contents of `database/schema.sql`
6. Click "Run"

## Step 9: Update Backend .env File

```powershell
# Get the path to backend .env
$ENV_PATH = "backend\.env"

# Read current .env file
$envContent = Get-Content $ENV_PATH -Raw

# Update database configuration
$envContent = $envContent -replace "DB_SERVER=.*", "DB_SERVER=$SQL_SERVER_NAME.database.windows.net"
$envContent = $envContent -replace "DB_DATABASE=.*", "DB_DATABASE=$SQL_DATABASE_NAME"
$envContent = $envContent -replace "DB_USER=.*", "DB_USER=$ADMIN_USER"
$envContent = $envContent -replace "DB_PASSWORD=.*", "DB_PASSWORD=$ADMIN_PASSWORD"
$envContent = $envContent -replace "DB_ENCRYPT=.*", "DB_ENCRYPT=true"

# Save updated .env file
Set-Content -Path $ENV_PATH -Value $envContent

Write-Host "`nBackend .env file updated!" -ForegroundColor Green
Write-Host "Location: $ENV_PATH" -ForegroundColor Yellow
```

## Step 10: Verify Connection

Test the database connection:
```powershell
cd backend
npm run dev
```

You should see in the logs:
```
[timestamp] info: Database connected successfully
[timestamp] info: Server running on port 5000
```

## Optional: Load Sample Data

```powershell
sqlcmd -S "$SQL_SERVER_NAME.database.windows.net" `
  -d $SQL_DATABASE_NAME `
  -U $ADMIN_USER `
  -P $ADMIN_PASSWORD `
  -i "database\seed-data.sql"

Write-Host "Sample data loaded!" -ForegroundColor Green
```

## Complete Setup Script

Here's a complete script that does everything:

```powershell
# ===== BulkEmailTool Azure SQL Database Setup =====

# Configuration
$RESOURCE_GROUP = "BulkEmailTool-RG"
$LOCATION = "eastus"
$SQL_SERVER_NAME = "bulkemailtool-sql-$(Get-Random -Maximum 9999)"
$SQL_DATABASE_NAME = "BulkEmailTool"
$ADMIN_USER = "sqladmin"
$ADMIN_PASSWORD = "YourSecureP@ssw0rd123!"  # CHANGE THIS!

Write-Host "Starting Azure SQL Database setup..." -ForegroundColor Cyan
Write-Host "Server name: $SQL_SERVER_NAME" -ForegroundColor Yellow

# Create resource group
Write-Host "`nCreating resource group..." -ForegroundColor Cyan
az group create --name $RESOURCE_GROUP --location $LOCATION

# Create SQL Server
Write-Host "`nCreating SQL Server..." -ForegroundColor Cyan
az sql server create `
  --name $SQL_SERVER_NAME `
  --resource-group $RESOURCE_GROUP `
  --location $LOCATION `
  --admin-user $ADMIN_USER `
  --admin-password $ADMIN_PASSWORD

# Configure firewall
Write-Host "`nConfiguring firewall..." -ForegroundColor Cyan
az sql server firewall-rule create `
  --resource-group $RESOURCE_GROUP `
  --server $SQL_SERVER_NAME `
  --name AllowAzureServices `
  --start-ip-address 0.0.0.0 `
  --end-ip-address 0.0.0.0

$MY_IP = (Invoke-WebRequest -Uri "https://api.ipify.org" -UseBasicParsing).Content
az sql server firewall-rule create `
  --resource-group $RESOURCE_GROUP `
  --server $SQL_SERVER_NAME `
  --name AllowMyIP `
  --start-ip-address $MY_IP `
  --end-ip-address $MY_IP

# Create database
Write-Host "`nCreating database..." -ForegroundColor Cyan
az sql db create `
  --resource-group $RESOURCE_GROUP `
  --server $SQL_SERVER_NAME `
  --name $SQL_DATABASE_NAME `
  --service-objective Basic `
  --backup-storage-redundancy Local

# Display connection info
Write-Host "`n===== SETUP COMPLETE =====" -ForegroundColor Green
Write-Host "`nAdd these to your backend/.env file:" -ForegroundColor Cyan
Write-Host "DB_SERVER=$SQL_SERVER_NAME.database.windows.net" -ForegroundColor Yellow
Write-Host "DB_DATABASE=$SQL_DATABASE_NAME" -ForegroundColor Yellow
Write-Host "DB_USER=$ADMIN_USER" -ForegroundColor Yellow
Write-Host "DB_PASSWORD=$ADMIN_PASSWORD" -ForegroundColor Yellow
Write-Host "DB_ENCRYPT=true" -ForegroundColor Yellow

Write-Host "`nNext steps:" -ForegroundColor Cyan
Write-Host "1. Update backend/.env with the values above" -ForegroundColor White
Write-Host "2. Run the schema: sqlcmd -S $SQL_SERVER_NAME.database.windows.net -d $SQL_DATABASE_NAME -U $ADMIN_USER -P $ADMIN_PASSWORD -i database\schema.sql" -ForegroundColor White
Write-Host "3. Start the backend: cd backend && npm run dev" -ForegroundColor White
```

Save this as `setup-azure-sql.ps1` and run it!

## Pricing Information

**Basic Tier** (Development):
- ~$5/month
- 2GB storage
- Good for development and testing

**Standard Tier** (Production):
- S1: ~$30/month - 250GB storage
- S2: ~$75/month - 250GB storage

To upgrade:
```powershell
az sql db update `
  --resource-group $RESOURCE_GROUP `
  --server $SQL_SERVER_NAME `
  --name $SQL_DATABASE_NAME `
  --service-objective S1
```

## Cleanup (Delete Everything)

If you need to start over:
```powershell
az group delete --name $RESOURCE_GROUP --yes --no-wait
```

## Troubleshooting

### Cannot connect from local machine
- Verify firewall rule includes your IP
- Check if your IP changed (dynamic IP)
- Re-run Step 5 to update firewall

### Authentication fails
- Verify username and password
- Check Azure Portal → SQL Server → Active Directory admin

### Schema execution fails
- Ensure you're connected to the correct database
- Check for syntax errors in schema.sql
- Run sections of schema.sql one at a time

---

**Ready to proceed?** 

1. Install Azure CLI
2. Run the complete setup script
3. Update your .env file
4. Run the schema
5. Start developing!

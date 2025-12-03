# Azure Deployment Guide - Using Azure Portal

## Prerequisites
- Azure subscription
- Azure SQL Database (already configured)
- Azure Storage Account (already configured)
- Azure AD App Registration (already configured)

---

## Option 1: Deploy Backend to Azure App Service

### Step 1: Create App Service
1. Go to [Azure Portal](https://portal.azure.com)
2. Click **Create a resource** → **Web App**
3. Fill in the details:
   - **Resource Group**: Select existing or create new (e.g., `bulk-email-tool-rg`)
   - **Name**: `bulk-email-backend-test` (must be globally unique)
   - **Publish**: Code
   - **Runtime stack**: Node 18 LTS
   - **Operating System**: Linux
   - **Region**: East US (or your preferred region)
   - **Pricing Plan**: B1 (Basic) for testing
4. Click **Review + Create** → **Create**

### Step 2: Configure App Settings (Environment Variables)
1. Navigate to your new App Service
2. Go to **Configuration** → **Application settings**
3. Click **New application setting** and add each:
   ```
   DB_SERVER = your-server.database.windows.net
   DB_NAME = BulkEmailTool
   DB_USER = your-db-username
   DB_PASSWORD = your-db-password
   JWT_SECRET = your-jwt-secret-key
   AZURE_CLIENT_ID = your-azure-ad-client-id
   AZURE_CLIENT_SECRET = your-azure-ad-client-secret
   AZURE_TENANT_ID = your-tenant-id
   AZURE_STORAGE_CONNECTION_STRING = your-storage-connection-string
   QUEUE_NAME = email-queue
   FRONTEND_URL = https://your-frontend-url.com
   PORT = 8080
   ```
4. Click **Save**

### Step 3: Enable CORS
1. In App Service, go to **CORS**
2. Add your frontend URL: `https://your-frontend-url.com`
3. Check **Enable Access-Control-Allow-Credentials**
4. Click **Save**

### Step 4: Deploy Backend Code
1. In App Service, go to **Deployment Center**
2. Choose deployment method:
   - **GitHub**: Connect your repository (automated)
   - **Local Git**: Get Git URL and push manually
   - **FTP/FTPS**: Upload files directly
   - **ZIP Deploy**: Upload zip file

**Recommended: GitHub Actions** (see below for workflow file)

---

## Option 2: Deploy Frontend to Azure Static Web Apps

### Step 1: Create Static Web App
1. Go to [Azure Portal](https://portal.azure.com)
2. Click **Create a resource** → **Static Web App**
3. Fill in the details:
   - **Resource Group**: Same as backend
   - **Name**: `bulk-email-frontend-test`
   - **Plan type**: Free (for testing)
   - **Region**: East US 2
   - **Deployment source**: GitHub
4. Sign in to GitHub and select:
   - **Organization**: jrobinson242
   - **Repository**: BulkEmailTool
   - **Branch**: master
5. **Build Details**:
   - **Build Presets**: Custom
   - **App location**: `/frontend`
   - **Api location**: (leave blank - using separate backend)
   - **Output location**: `build`
6. Click **Review + Create** → **Create**

### Step 2: Configure Environment Variables
1. Navigate to your Static Web App
2. Go to **Configuration** → **Application settings**
3. Add:
   ```
   REACT_APP_API_URL = https://bulk-email-backend-test.azurewebsites.net
   ```
4. Click **Save**

### Step 3: Update Azure AD Redirect URI
1. Go to **Azure AD** → **App registrations**
2. Select your app registration
3. Go to **Authentication** → **Platform configurations** → **Single-page application**
4. Add redirect URI: `https://bulk-email-frontend-test.azurestaticapps.net`
5. Click **Save**

---

## Option 3: Deploy Frontend to Azure Storage (Static Website)

### Step 1: Enable Static Website Hosting
1. Go to your Storage Account
2. Navigate to **Static website** (under Data management)
3. Enable static website hosting
4. Set **Index document name**: `index.html`
5. Set **Error document path**: `index.html`
6. Note the **Primary endpoint** URL
7. Click **Save**

### Step 2: Build and Upload Frontend
1. Build frontend locally:
   ```powershell
   cd frontend
   npm run build
   ```
2. In Azure Portal, go to Storage Account → **Containers** → **$web**
3. Click **Upload** and select all files from `frontend/build` folder
4. Upload maintaining folder structure

### Step 3: Configure Custom Domain (Optional)
1. In Storage Account, go to **Custom domain**
2. Add your domain name
3. Create CNAME record in your DNS provider

---

## Alternative: Deploy to Azure Container Instances

### For Backend:
1. Create Dockerfile in `/backend`:
   ```dockerfile
   FROM node:18-alpine
   WORKDIR /app
   COPY package*.json ./
   RUN npm install --production
   COPY . .
   EXPOSE 5000
   CMD ["node", "src/server.js"]
   ```

2. Build and push to Azure Container Registry:
   ```powershell
   docker build -t bulk-email-backend .
   # Push to ACR or Docker Hub
   ```

3. Create Container Instance from portal

---

## Post-Deployment Steps

### 1. Update CORS Settings
Ensure backend allows frontend domain in CORS configuration

### 2. Test Database Connection
Check App Service logs to verify SQL connection

### 3. Verify Queue Connection
Test email sending functionality

### 4. Update OAuth Callback URLs
Add production URLs to Azure AD app registration

### 5. Enable Application Insights (Recommended)
1. Create Application Insights resource
2. Add connection string to App Service settings:
   ```
   APPLICATIONINSIGHTS_CONNECTION_STRING = your-connection-string
   ```

---

## Monitoring and Logs

### View App Service Logs:
1. Go to App Service → **Log stream**
2. Or download logs from **App Service logs** → **File System**

### View Static Web App Logs:
1. Go to Static Web App → **Functions** → **Monitor**

### View Application Insights:
1. Navigate to Application Insights resource
2. Check **Live Metrics**, **Failures**, **Performance**

---

## Troubleshooting

### Backend Won't Start:
- Check environment variables are set correctly
- Review logs in Log stream
- Verify node version matches (18 LTS)
- Check package.json start script

### Frontend Shows API Errors:
- Verify REACT_APP_API_URL is correct
- Check CORS settings on backend
- Verify backend is running

### Database Connection Fails:
- Check SQL Server firewall allows Azure services
- Verify connection string format
- Test credentials with SQL Server Management Studio

### OAuth Not Working:
- Verify redirect URIs match exactly (https, no trailing slash)
- Check Azure AD app permissions
- Verify client ID and tenant ID

---

## Cost Estimation (Monthly)

- **App Service B1**: ~$13/month
- **Static Web App (Free)**: $0
- **Azure SQL Database (Basic)**: ~$5/month
- **Storage Account**: ~$1/month
- **Application Insights**: Free tier (5GB/month)

**Total**: ~$19/month for test environment

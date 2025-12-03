# VS Code Azure Deployment Guide

Deploy your Bulk Email Tool directly from Visual Studio Code using Azure extensions.

---

## Prerequisites

### Install VS Code Extensions:

1. **Azure App Service**
   - Extension ID: `ms-azuretools.vscode-azureappservice`
   - Install: Press `Ctrl+P`, type `ext install ms-azuretools.vscode-azureappservice`

2. **Azure Static Web Apps**
   - Extension ID: `ms-azuretools.vscode-azurestaticwebapps`
   - Install: Press `Ctrl+P`, type `ext install ms-azuretools.vscode-azurestaticwebapps`

3. **Azure Resources**
   - Extension ID: `ms-azuretools.vscode-azureresourcegroups`
   - Install: Press `Ctrl+P`, type `ext install ms-azuretools.vscode-azureresourcegroups`

4. **Azure Account**
   - Extension ID: `ms-vscode.azure-account`
   - Install: Press `Ctrl+P`, type `ext install ms-vscode.azure-account`

---

## Part 1: Deploy Backend to Azure App Service

### Step 1: Sign in to Azure
1. Press `Ctrl+Shift+P`
2. Type `Azure: Sign In`
3. Follow the authentication prompts

### Step 2: Create App Service
1. Click the **Azure** icon in the left sidebar
2. Expand **App Service**
3. Click **+** to create new App Service
4. Follow prompts:
   - **Select subscription**: Choose your subscription
   - **Enter name**: `bulk-email-backend-test`
   - **Select runtime**: Node 18 LTS
   - **Select OS**: Linux
   - **Select location**: East US
   - **Select pricing tier**: B1 (Basic)

### Step 3: Configure Environment Variables
1. In Azure sidebar, expand **App Service**
2. Right-click your app → **Open in Portal**
3. Or in VS Code:
   - Right-click app → **Application Settings**
   - Click **Add New Setting** for each variable:
     ```
     DB_SERVER
     DB_NAME
     DB_USER
     DB_PASSWORD
     JWT_SECRET
     AZURE_CLIENT_ID
     AZURE_CLIENT_SECRET
     AZURE_TENANT_ID
     AZURE_STORAGE_CONNECTION_STRING
     QUEUE_NAME
     PORT
     NODE_ENV
     ```

### Step 4: Deploy Backend Code
1. Right-click the `backend` folder in VS Code
2. Select **Deploy to Web App...**
3. Choose your App Service
4. Confirm deployment
5. Wait for deployment to complete
6. Click **Browse Website** to test

**Alternative:**
- Press `Ctrl+Shift+P`
- Type `Azure App Service: Deploy to Web App`
- Select `backend` folder
- Select your App Service

---

## Part 2: Deploy Frontend to Static Web Apps

### Step 1: Create Static Web App
1. In Azure sidebar, expand **Static Web Apps**
2. Click **+** to create new
3. Follow prompts:
   - **Select subscription**: Choose your subscription
   - **Enter name**: `bulk-email-frontend-test`
   - **Select region**: East US 2
   - **Select build preset**: React
   - **Enter app location**: `/frontend`
   - **Enter build location**: `build`
   - **Connect to GitHub**: Authenticate and select repo

### Step 2: Configure Environment Variables
1. Right-click Static Web App
2. Select **Application Settings**
3. Add setting:
   ```
   REACT_APP_API_URL = https://bulk-email-backend-test.azurewebsites.net
   ```

### Step 3: Auto-Deploy on Push
- Static Web Apps automatically deploys when you push to GitHub
- GitHub Actions workflow is created automatically
- View deployment status in **Actions** tab on GitHub

---

## Part 3: Deploy Frontend to Azure Storage (Alternative)

### Step 1: Build Frontend
1. Open terminal in VS Code (`Ctrl+` `)
2. Navigate to frontend:
   ```powershell
   cd frontend
   npm run build
   ```

### Step 2: Deploy to Storage
1. In Azure sidebar, expand **Storage**
2. Find your storage account
3. Expand **Blob Containers**
4. Right-click **$web** container
5. Select **Upload Files**
6. Select all files from `frontend/build` folder
7. Maintain folder structure during upload

**Faster method:**
- Install **Azure Storage** extension
- Right-click `frontend/build` folder
- Select **Deploy to Static Website via Azure Storage**

---

## Managing Deployments

### View Logs:
1. Right-click App Service
2. Select **Start Streaming Logs**
3. View real-time logs in Output panel

### Restart App:
1. Right-click App Service
2. Select **Restart**

### Stop/Start App:
1. Right-click App Service
2. Select **Stop** or **Start**

### Browse Website:
1. Right-click App Service or Static Web App
2. Select **Browse Website**

### Open in Portal:
1. Right-click any resource
2. Select **Open in Portal**

---

## Monitoring with VS Code

### Application Insights:
1. Install **Azure Application Insights** extension
2. In Azure sidebar, expand **Application Insights**
3. View:
   - Live Metrics
   - Failures
   - Performance
   - Requests

### View Metrics:
1. Right-click App Service
2. Select **View Properties**
3. See CPU, Memory, Response time

---

## Deployment Slots (Zero-Downtime Deployment)

### Create Staging Slot:
1. Right-click App Service
2. Select **Create Slot**
3. Name it `staging`

### Deploy to Staging:
1. Deploy code to staging slot first
2. Test thoroughly
3. Right-click slot → **Swap with Production**

---

## Troubleshooting in VS Code

### View App Service Files:
1. Expand App Service in Azure sidebar
2. Expand **Files**
3. Browse deployed files
4. Edit files directly (not recommended for production)

### Download Logs:
1. Right-click App Service
2. Select **Download Remote Files**
3. Select `LogFiles` folder

### Connect via SSH:
1. Right-click App Service (Linux)
2. Select **SSH into Web App**
3. Access terminal directly

---

## Quick Commands (Ctrl+Shift+P)

### Useful VS Code Commands:
- `Azure App Service: Create New Web App`
- `Azure App Service: Deploy to Web App`
- `Azure App Service: Browse Website`
- `Azure App Service: Start Streaming Logs`
- `Azure Static Web Apps: Create Static Web App`
- `Azure: Sign In`
- `Azure: Sign Out`
- `Azure: Select Subscriptions`

---

## Tips for Efficient Deployment

1. **Save deployment configuration**:
   - VS Code remembers your last deployment target
   - Subsequent deploys are just one click

2. **Use workspace settings**:
   - Create `.vscode/settings.json`:
     ```json
     {
       "appService.defaultWebAppToDeploy": "/subscriptions/.../bulk-email-backend-test",
       "appService.deploySubpath": "backend"
     }
     ```

3. **Exclude files from deployment**:
   - Create `.deployment` file in backend:
     ```
     [config]
     project = backend
     
     [ignore]
     node_modules
     .git
     logs
     *.log
     ```

4. **Set up Tasks**:
   - Create `.vscode/tasks.json`:
     ```json
     {
       "version": "2.0.0",
       "tasks": [
         {
           "label": "Deploy Backend",
           "type": "shell",
           "command": "echo 'Deploying...'",
           "problemMatcher": []
         }
       ]
     }
     ```

---

## Resources

- **Azure Tools for VS Code**: https://marketplace.visualstudio.com/items?itemName=ms-vscode.vscode-node-azure-pack
- **Documentation**: https://docs.microsoft.com/azure/app-service/quickstart-nodejs-deploy
- **Troubleshooting**: https://docs.microsoft.com/azure/app-service/troubleshoot-diagnostic-logs

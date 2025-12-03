# GitHub Actions Deployment Setup

This guide explains how to set up automated deployments using GitHub Actions.

## Prerequisites

1. GitHub repository with code
2. Azure subscription
3. Azure resources created (App Service, Static Web App, etc.)

---

## Step 1: Create Azure Service Principal

Run these commands in Azure CLI to create credentials for GitHub Actions:

```powershell
# Login to Azure
az login

# Get your subscription ID
az account show --query id --output tsv

# Create service principal (replace SUBSCRIPTION_ID)
az ad sp create-for-rbac `
  --name "github-actions-bulk-email" `
  --role contributor `
  --scopes /subscriptions/SUBSCRIPTION_ID/resourceGroups/bulk-email-tool-rg `
  --sdk-auth
```

This will output JSON like:
```json
{
  "clientId": "...",
  "clientSecret": "...",
  "subscriptionId": "...",
  "tenantId": "...",
  "activeDirectoryEndpointUrl": "...",
  "resourceManagerEndpointUrl": "...",
  "activeDirectoryGraphResourceId": "...",
  "sqlManagementEndpointUrl": "...",
  "galleryEndpointUrl": "...",
  "managementEndpointUrl": "..."
}
```

**Copy this entire JSON output** - you'll need it for GitHub secrets.

---

## Step 2: Add GitHub Secrets

1. Go to your GitHub repository: https://github.com/jrobinson242/BulkEmailTool
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret** and add each:

### Required Secrets:

| Secret Name | Value | Description |
|------------|-------|-------------|
| `AZURE_CREDENTIALS` | Entire JSON from Step 1 | Azure service principal credentials |
| `AZURE_STATIC_WEB_APPS_API_TOKEN` | Get from Static Web App settings | For frontend deployment |
| `REACT_APP_API_URL` | `https://bulk-email-backend-test.azurewebsites.net` | Backend URL |
| `AZURE_CLIENT_ID` | Your Azure AD app client ID | For OAuth |
| `AZURE_TENANT_ID` | Your Azure AD tenant ID | For OAuth |
| `STORAGE_ACCOUNT_NAME` | Your storage account name | If using storage for frontend |
| `FRONTEND_URL` | `https://bulk-email-frontend-test.azurestaticapps.net` | Frontend URL |

### To get Static Web Apps API Token:
1. Go to Azure Portal
2. Navigate to your Static Web App
3. Click **Manage deployment token**
4. Copy the token
5. Add as `AZURE_STATIC_WEB_APPS_API_TOKEN` in GitHub

---

## Step 3: Verify Workflow File

The workflow file is already created at `.github/workflows/azure-deploy.yml`

### What it does:
- **On Push to master/develop**: Automatically deploys
- **Builds Backend**: Installs dependencies, creates ZIP
- **Deploys Backend**: Uploads to Azure App Service
- **Builds Frontend**: Runs npm build with env variables
- **Deploys Frontend**: Uploads to Static Web App or Storage
- **Health Check**: Verifies deployment succeeded

---

## Step 4: Configure Branch Protection (Optional)

1. Go to **Settings** → **Branches**
2. Add rule for `master` branch:
   - ✅ Require pull request before merging
   - ✅ Require status checks to pass
   - Select: `build-and-deploy-backend`, `build-frontend`

---

## Step 5: Test the Workflow

### Option 1: Push to master
```powershell
git add .
git commit -m "Deploy to Azure"
git push origin master
```

### Option 2: Manual trigger
1. Go to **Actions** tab in GitHub
2. Select **Deploy to Azure** workflow
3. Click **Run workflow**
4. Choose branch and click **Run workflow**

---

## Monitoring Deployments

### View Workflow Status:
1. Go to **Actions** tab
2. Click on the latest workflow run
3. View logs for each job

### View Azure Logs:
```powershell
# Backend logs
az webapp log tail --name bulk-email-backend-test --resource-group bulk-email-tool-rg

# Or in Azure Portal
# Go to App Service → Log stream
```

---

## Troubleshooting

### Error: "Resource not found"
- Verify resource names in workflow file match Azure
- Check `BACKEND_APP_NAME` and `RESOURCE_GROUP` in workflow

### Error: "Authentication failed"
- Regenerate service principal credentials
- Update `AZURE_CREDENTIALS` secret

### Error: "Static Web App token invalid"
- Get new deployment token from Azure Portal
- Update `AZURE_STATIC_WEB_APPS_API_TOKEN`

### Frontend shows old version:
- Check CDN cache (may take a few minutes)
- Hard refresh browser (Ctrl+Shift+R)
- Verify build artifacts uploaded correctly

### Backend shows 500 errors:
- Check App Service logs
- Verify environment variables are set
- Check Application Insights for errors

---

## Multiple Environments

To deploy to different environments:

### Create environment-specific workflows:

1. **Production** (master branch):
   - Uses production secrets
   - Deploys to `bulk-email-backend-prod`

2. **Staging** (develop branch):
   - Uses staging secrets
   - Deploys to `bulk-email-backend-staging`

3. **Pull Requests**:
   - Builds only, doesn't deploy
   - Runs tests and linting

### Add environment secrets:
1. Go to **Settings** → **Environments**
2. Create `production` and `staging`
3. Add environment-specific secrets
4. Require approval for production

---

## CI/CD Best Practices

1. **Always run tests before deploy**
2. **Use staging environment** for testing
3. **Enable deployment approvals** for production
4. **Monitor Application Insights** after deployment
5. **Keep secrets updated** and rotate regularly
6. **Use pull requests** for code review
7. **Tag releases** for rollback capability

---

## Rollback Procedure

If deployment fails:

### Option 1: Re-run previous workflow
1. Go to **Actions**
2. Find last successful run
3. Click **Re-run jobs**

### Option 2: Deploy specific commit
```powershell
git revert HEAD
git push origin master
```

### Option 3: Azure Portal rollback
1. Go to App Service → **Deployment slots**
2. Swap to previous slot
3. Or go to **Deployment Center** → Previous deployments → **Redeploy**

---

## Cost Optimization

- Use deployment slots for zero-downtime deployments
- Schedule deployments during off-peak hours
- Clean up old deployment artifacts
- Monitor usage in Azure Cost Management

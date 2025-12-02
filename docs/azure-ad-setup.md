# Azure AD Authentication Setup Guide

## Overview

This application uses OAuth2 authentication via Azure Active Directory to securely access Microsoft Graph API for Outlook integration.

## Prerequisites

- Azure subscription
- Azure AD tenant
- Global Administrator or Application Administrator role

## Step 1: Register Application in Azure AD

### Using Azure Portal

1. Navigate to [Azure Portal](https://portal.azure.com)
2. Go to **Azure Active Directory** > **App registrations**
3. Click **New registration**
4. Configure the application:
   - **Name**: BulkEmailTool
   - **Supported account types**: Accounts in this organizational directory only
   - **Redirect URI**: 
     - Type: Web
     - URL: `http://localhost:3000/auth/callback` (for development)
5. Click **Register**

### Using Azure CLI

```bash
az ad app create \
  --display-name "BulkEmailTool" \
  --sign-in-audience AzureADMyOrg \
  --web-redirect-uris "http://localhost:3000/auth/callback"
```

## Step 2: Configure API Permissions

### Required Microsoft Graph Permissions

1. In your app registration, go to **API permissions**
2. Click **Add a permission** > **Microsoft Graph** > **Delegated permissions**
3. Add the following permissions:
   - `User.Read` - Read user profile
   - `Contacts.Read` - Read user contacts
   - `Mail.Send` - Send mail as user
   - `offline_access` - Maintain access to data

4. Click **Add permissions**
5. Click **Grant admin consent** (requires admin privileges)

### Using Azure CLI

```bash
# Get the app ID from previous command or portal
APP_ID="your-app-id-here"

# Add permissions
az ad app permission add \
  --id $APP_ID \
  --api 00000003-0000-0000-c000-000000000000 \
  --api-permissions \
    e1fe6dd8-ba31-4d61-89e7-88639da4683d=Scope \
    ff74d97f-43af-4b68-9f2a-b77ee6968c5d=Scope \
    e383f46e-2787-4529-855e-0e479a3ffac0=Scope \
    7427e0e9-2fba-42fe-b0c0-848c9e6a8182=Scope

# Grant admin consent
az ad app permission admin-consent --id $APP_ID
```

## Step 3: Create Client Secret

### Using Azure Portal

1. In your app registration, go to **Certificates & secrets**
2. Click **New client secret**
3. Configure:
   - **Description**: BulkEmailTool Secret
   - **Expires**: 24 months (or your preference)
4. Click **Add**
5. **IMPORTANT**: Copy the secret value immediately (it won't be shown again)

### Using Azure CLI

```bash
az ad app credential reset \
  --id $APP_ID \
  --append \
  --display-name "BulkEmailTool Secret" \
  --years 2
```

## Step 4: Configure Application

### Backend Configuration

Update `backend/.env`:

```env
# Azure AD Configuration
AZURE_CLIENT_ID=your-application-client-id
AZURE_CLIENT_SECRET=your-client-secret-value
AZURE_TENANT_ID=your-tenant-id
REDIRECT_URI=http://localhost:3000/auth/callback

# For production, use your production URL:
# REDIRECT_URI=https://your-domain.com/auth/callback
```

### Frontend Configuration

Update `frontend/.env`:

```env
REACT_APP_AZURE_CLIENT_ID=your-application-client-id
REACT_APP_AZURE_TENANT_ID=your-tenant-id
REACT_APP_REDIRECT_URI=http://localhost:3000/auth/callback
```

## Step 5: Configure Production Redirect URIs

When deploying to production, add your production redirect URI:

### Using Azure Portal

1. Go to your app registration > **Authentication**
2. Under **Web** redirect URIs, click **Add URI**
3. Add: `https://your-production-domain.com/auth/callback`
4. Click **Save**

### Using Azure CLI

```bash
az ad app update \
  --id $APP_ID \
  --web-redirect-uris \
    "http://localhost:3000/auth/callback" \
    "https://your-production-domain.com/auth/callback"
```

## Step 6: Test Authentication Flow

1. Start the backend server: `cd backend && npm start`
2. Start the frontend: `cd frontend && npm start`
3. Navigate to `http://localhost:3000`
4. Click "Sign in with Microsoft"
5. Authenticate with your Microsoft 365 account
6. Grant consent to the requested permissions
7. You should be redirected back to the application

## OAuth2 Flow Diagram

```
User → Frontend → Azure AD Login
                      ↓
                   User Authenticates
                      ↓
                   Azure AD → Authorization Code
                      ↓
Frontend → Backend → Exchange Code for Tokens
                      ↓
                   Access Token + Refresh Token
                      ↓
Backend → Microsoft Graph API (with Access Token)
```

## Security Best Practices

### 1. Secure Token Storage

- Backend: Never expose client secret in client-side code
- Frontend: Store access tokens securely (consider HttpOnly cookies in production)
- Implement token refresh logic before expiration

### 2. Validate Tokens

```javascript
// Backend should validate tokens
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

const client = jwksClient({
  jwksUri: `https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`
});

// Validate token signature
```

### 3. Implement PKCE for Enhanced Security

For production, consider implementing Proof Key for Code Exchange (PKCE):

```javascript
// Generate code verifier and challenge
const crypto = require('crypto');

const codeVerifier = crypto.randomBytes(32).toString('base64url');
const codeChallenge = crypto
  .createHash('sha256')
  .update(codeVerifier)
  .digest('base64url');
```

### 4. Use Managed Identity in Azure

When deployed to Azure App Service, use Managed Identity instead of client secrets:

```javascript
const { DefaultAzureCredential } = require('@azure/identity');
const credential = new DefaultAzureCredential();
```

## Troubleshooting

### Common Issues

**Error: AADSTS50011 - The reply URL specified in the request does not match**
- Solution: Verify redirect URI matches exactly in Azure AD and your application

**Error: AADSTS65001 - The user or administrator has not consented**
- Solution: Grant admin consent in Azure AD portal

**Error: AADSTS700016 - Application not found**
- Solution: Verify client ID is correct

**Token expires quickly**
- Solution: Implement refresh token logic to obtain new access tokens

### Debug Mode

Enable debug logging in your application:

```env
# Backend
LOG_LEVEL=debug

# Frontend
REACT_APP_DEBUG=true
```

## Additional Resources

- [Microsoft identity platform documentation](https://docs.microsoft.com/en-us/azure/active-directory/develop/)
- [Microsoft Graph API reference](https://docs.microsoft.com/en-us/graph/api/overview)
- [OAuth 2.0 authorization code flow](https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-oauth2-auth-code-flow)
- [Best practices for Azure AD authentication](https://docs.microsoft.com/en-us/azure/active-directory/develop/identity-platform-integration-checklist)

## Compliance Considerations

### GDPR/CCPA

- Implement data retention policies
- Provide user data export functionality
- Honor unsubscribe requests
- Maintain audit logs of consent

### Data Processing Agreement

Ensure you have appropriate agreements with Microsoft for processing user data through Microsoft Graph API.

## Multi-Tenant Support (Optional)

To support multiple organizations:

1. Change **Supported account types** to "Multitenant"
2. Update authentication flow to handle dynamic tenant IDs
3. Implement tenant isolation in your database
4. Handle admin consent per tenant

```javascript
// Multi-tenant consent URL
const consentUrl = `https://login.microsoftonline.com/common/adminconsent?client_id=${clientId}`;
```

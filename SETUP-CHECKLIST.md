# Setup Checklist - BulkEmailTool

## ✅ Fixed Issues

### 1. Environment File Naming
**Problem**: Files were named `.env.dev` instead of `.env`
**Solution**: Copied both files to `.env` for Vite/Node.js to recognize them

**Vite Only Loads**:
- `.env` - Default environment file
- `.env.local` - Local overrides (not committed to git)
- `.env.development` - Development mode (when running `npm run dev`)
- `.env.production` - Production mode (when running `npm run build`)

### 2. Azure Client ID Mismatch
**Problem**: Frontend and backend had different Client IDs
**Solution**: Updated frontend to match backend

**Current Configuration**:
- **Client ID**: `1550bfe1-93fa-4533-b390-0fcf358352a7`
- **Tenant ID**: `7903f66e-7c6d-487c-9bd0-788aa8eb21df`
- **Redirect URI**: `http://localhost:3000/auth/callback`

## 🔧 Current Setup Status

### ✅ Completed
- [x] Frontend `.env` file created with correct Azure credentials
- [x] Backend `.env` file exists with Azure credentials
- [x] Client IDs matched between frontend and backend
- [x] Tenant IDs matched

### ⚠️ Needs Configuration
- [ ] **Database**: Still has placeholder values
  - `DB_SERVER=your-sql-server.database.windows.net`
  - `DB_DATABASE=BulkEmailTool`
  - `DB_USER=your-db-username`
  - `DB_PASSWORD=your-db-password`

- [ ] **Azure Storage**: Still has placeholder
  - `AZURE_STORAGE_CONNECTION_STRING=your-storage-connection-string`

- [ ] **JWT Secret**: Update this for security
  - `JWT_SECRET=your-jwt-secret-here`

## 🚀 To Start the Application

### 1. Start Backend (Terminal 1)
```powershell
cd backend
npm run dev
```
Expected output:
```
[timestamp] info: Server running on port 5000
```

### 2. Start Frontend (Terminal 2)
```powershell
cd frontend
npm run dev
```
Expected output:
```
VITE v6.4.1  ready in 200ms
➜  Local:   http://localhost:3000/
```

### 3. Test Login
1. Navigate to http://localhost:3000
2. Click "Sign in with Microsoft"
3. Authenticate with your Microsoft 365 account

## 🔍 Verify Azure AD Configuration

Your Azure AD app registration should have:

### ✅ Redirect URIs
In Azure Portal → App Registration → Authentication:
- **Web**: `http://localhost:3000/auth/callback`

### ✅ API Permissions (Delegated)
- `User.Read` - Read user profile
- `Contacts.Read` - Read user contacts  
- `Mail.Send` - Send mail as user
- `offline_access` - Maintain access to data

### ✅ Admin Consent
Ensure "Admin consent required" shows "Yes" and is granted (green checkmark)

### ✅ Client Secret
Make sure your client secret hasn't expired:
- In Azure Portal → App Registration → Certificates & secrets
- Check the "Expires" date for your secret

## 🐛 Troubleshooting

### Error: "Failed to initiate login"

**Possible Causes**:
1. **.env file not loaded** (FIXED ✅)
   - Was named `.env.dev` instead of `.env`
   
2. **Client ID mismatch** (FIXED ✅)
   - Frontend and backend now use same Client ID

3. **Backend not running**
   - Check Terminal 1 for backend errors
   - Verify port 5000 is available

4. **Redirect URI mismatch**
   - Must exactly match in Azure AD: `http://localhost:3000/auth/callback`
   - No trailing slash!

5. **Client secret expired**
   - Check Azure Portal → Certificates & secrets
   - Create new secret if expired

### Check Environment Variables are Loaded

**Frontend**:
```powershell
cd frontend
npm run dev
```
Open browser console (F12) and type:
```javascript
console.log(import.meta.env.VITE_AZURE_CLIENT_ID)
```
Should show: `1550bfe1-93fa-4533-b390-0fcf358352a7`

**Backend**:
Check the logs when backend starts - it should NOT show undefined values.

### Common Errors

**"AADSTS50011: The reply URL specified does not match"**
→ Update Azure AD redirect URI to exactly: `http://localhost:3000/auth/callback`

**"AADSTS700016: Application not found"**
→ Verify Client ID is correct in both .env files

**"AADSTS65001: User has not consented"**
→ Click "Grant admin consent" in Azure AD API permissions

**Backend CORS errors**
→ Backend should allow `http://localhost:3000` (already configured)

## 📋 Quick Reference

### File Locations
```
frontend/.env          # Frontend environment variables (Vite)
backend/.env           # Backend environment variables (Node.js)
frontend/.env.dev      # Your original file (backup)
backend/.env.dev       # Your original file (backup)
```

### Environment Variables Format

**Frontend** uses `VITE_` prefix:
```env
VITE_API_URL=http://localhost:5000/api
VITE_AZURE_CLIENT_ID=1550bfe1-93fa-4533-b390-0fcf358352a7
VITE_AZURE_TENANT_ID=7903f66e-7c6d-487c-9bd0-788aa8eb21df
VITE_REDIRECT_URI=http://localhost:3000/auth/callback
```

**Backend** uses no prefix:
```env
AZURE_CLIENT_ID=your-azure-client-id
AZURE_CLIENT_SECRET=your-azure-client-secret
AZURE_TENANT_ID=your-azure-tenant-id
REDIRECT_URI=http://localhost:3000/auth/callback
```

## 🔐 Security Notes

1. **Never commit `.env` files** to Git (already in `.gitignore`)
2. **Rotate client secrets** periodically in Azure AD
3. **Use different secrets** for development vs production
4. **Update JWT_SECRET** before production deployment

## ✨ Next Steps

Once login is working:
1. Set up Azure SQL Database (see `database/README.md`)
2. Set up Azure Storage Account for email queue
3. Test contact sync from Outlook
4. Create and test email templates
5. Send test campaign

## 🆘 Still Having Issues?

1. **Restart both servers** after changing `.env` files
2. **Clear browser cache** and localStorage:
   ```javascript
   localStorage.clear()
   ```
3. **Check browser console** (F12) for error messages
4. **Check backend logs** in the terminal
5. **Verify Azure AD configuration** in Azure Portal

---

**Setup Date**: December 2, 2025  
**Status**: Environment files configured ✅  
**Action Required**: Start both servers and test login

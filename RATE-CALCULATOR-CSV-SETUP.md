# Rate Calculator - CSV Client Management Setup

## Overview
The Rate Calculator now uses local database storage for clients instead of SharePoint lists. Clients can be managed through a modal interface with two methods:

1. **Add Single Client** - Add one client at a time via form
2. **Upload CSV** - Bulk import clients from CSV data

## Database Setup

### 1. Create RateClients Table
Run this SQL migration on your Azure SQL database:

```sql
-- Add RateClients table for Rate Calculator
CREATE TABLE RateClients (
    ClientId INT IDENTITY(1,1) PRIMARY KEY,
    UserId NVARCHAR(255) NOT NULL,
    Name NVARCHAR(255) NOT NULL,
    Email NVARCHAR(255),
    Contact NVARCHAR(255),
    Description NVARCHAR(MAX),
    CreatedAt DATETIME2 DEFAULT GETDATE(),
    UpdatedAt DATETIME2,
    FOREIGN KEY (UserId) REFERENCES Users(UserId) ON DELETE CASCADE
);

CREATE INDEX IX_RateClients_UserId ON RateClients(UserId);
CREATE INDEX IX_RateClients_Name ON RateClients(Name);
```

**File:** `database/add-rate-clients-table.sql`

## Backend Files Created

### 1. Routes: `backend/src/routes/rateClients.js`
REST API endpoints for client management:
- `GET /clients` - Get all clients for current user
- `POST /clients` - Create a new client
- `PUT /clients/:clientId` - Update a client
- `DELETE /clients/:clientId` - Delete a client
- `POST /clients/upload-csv` - Upload clients from CSV

### 2. Service: `backend/src/services/rateClientsService.js`
Database operations and CSV parsing:
- `getClients(userId)` - Fetch all user's clients
- `createClient(userId, clientData)` - Add new client
- `updateClient(userId, clientId, clientData)` - Update existing client
- `deleteClient(userId, clientId)` - Remove client
- `uploadClientsFromCSV(userId, csvData)` - Parse and import CSV

**CSV Format Expected:**
```
Name,Email,Contact,Description
Acme Corp,info@acme.com,John Doe,Main client
TechCorp,hello@techcorp.com,Jane Smith,Secondary client
```

## Frontend Files Created

### 1. Component: `frontend/src/components/ClientModal.jsx`
Modal interface with two tabs:

**Tab 1: Add Client**
- Form with fields: Name (required), Email, Contact Person, Description
- Submit button to add single client
- Success/error notifications

**Tab 2: Upload CSV**
- Large textarea for CSV content paste
- Supports multi-row import
- Shows import results and any errors
- Validates required "Name" column

### 2. API Service: `frontend/src/services/rateClientsAPI.jsx`
Axios wrapper for client endpoints:
- `getClients()` - Fetch clients
- `createClient(data)` - Add client
- `updateClient(id, data)` - Modify client
- `deleteClient(id)` - Remove client
- `uploadClientsFromCSV(csvData)` - Import from CSV

### 3. Styling: `frontend/src/styles/ClientModal.css`
Professional modal styling with:
- Overlay effect
- Responsive layout
- Tab navigation
- Form styling
- Error/success alerts
- CSV hint text

## Frontend Changes to RateCalculator

### Updated `frontend/src/pages/RateCalculator.jsx`

1. **Added imports:**
   - `rateClientsAPI` - New client service
   - `ClientModal` - Modal component

2. **New state:**
   - `showClientModal` - Boolean to toggle modal visibility

3. **Updated data fetching:**
   - Changed from `rateCalculatorAPI.getClients()` to `rateClientsAPI.getClients()`
   - Now fetches from local database instead of SharePoint

4. **Updated JSX:**
   - Added "Manage Clients" link button next to Client label
   - Updated dropdown to use `ClientId` and `Name` fields (database schema)
   - Added `<ClientModal />` component at bottom of component

5. **New callback:**
   - `onClientCreated` - Reloads client list after adding/uploading clients

## Backend Server Update

### `backend/src/server.js`

Added:
```javascript
const rateClientsRoutes = require('./routes/rateClients');

// Register route
app.use('/api/rate-calculator', rateClientsRoutes);
```

All client endpoints are now available at `/api/rate-calculator/clients`

## How to Use

### For End Users

1. **Access Rate Calculator** - Navigate to the Rate Calculator page

2. **Manage Clients - Single Add:**
   - Click "Manage Clients" link under Client dropdown
   - Click "Add Client" tab
   - Fill in Name (required), Email, Contact, Description
   - Click "Add Client"

3. **Manage Clients - Bulk Import:**
   - Click "Manage Clients" link under Client dropdown
   - Click "Upload CSV" tab
   - Paste CSV content with format: `Name,Email,Contact,Description`
   - Click "Import Clients"
   - View results and any error messages

4. **Select Client:**
   - After modal closes, client list updates automatically
   - Select your client from the dropdown
   - Continue with rate calculations

### CSV Format Examples

**Minimal (Name only):**
```
Name
Acme Corp
TechCorp
```

**Full (All fields):**
```
Name,Email,Contact,Description
Acme Corp,info@acme.com,John Doe,Fortune 500
TechCorp,hello@techcorp.com,Jane Smith,Mid-market tech
```

**Mixed (Some fields):**
```
Name,Contact,Description
Acme Corp,John Doe,Main client
TechCorp,,Secondary client
```

## Database Queries

### View all clients:
```sql
SELECT * FROM RateClients WHERE UserId = @userId ORDER BY Name;
```

### Delete all clients for a user:
```sql
DELETE FROM RateClients WHERE UserId = @userId;
```

## Error Handling

- **Missing Name in CSV:** Row skipped, error shown
- **Database connection fails:** User-friendly error message
- **Unauthorized access:** Only user's own clients returned
- **Validation errors:** Shown in modal with red alert

## Security Notes

- All endpoints require `authenticateToken` middleware
- Users can only access/modify their own clients
- Foreign key ensures clients deleted when user deleted
- Input validation on Name (required)
- CSRF protection via authentication token

## Migration Path from SharePoint

If you previously used SharePoint lists:

1. Export your SharePoint client list as CSV
2. Format to match: `Name,Email,Contact,Description`
3. Use "Upload CSV" tab in modal
4. Clients are now in database, linked to your user account

## Next Steps

- Users can now manage clients independently
- No SharePoint configuration needed
- Easily add/import new clients
- Rate calculations continue as before but with local client data

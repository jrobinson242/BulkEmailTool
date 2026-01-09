# Rate Calculator Feature

## Overview

The Rate Calculator is a tool that helps calculate staffing rates and margins for different employment types. It takes various inputs and calculates key metrics like markup percentage, gross profit, and gross profit per hour.

## Features

✅ **Client Selection** - Pull clients from SharePoint list  
✅ **Employment Type Support** - C2C, W2 Hourly, and Full-Time  
✅ **Flexible Discounts** - Use predefined discounts or enter custom percentages  
✅ **Real-time Calculations** - All values update instantly  
✅ **Multiple Output Metrics** - 6 key business metrics calculated  

## Inputs

| Field | Type | Description | Required |
|-------|------|-------------|----------|
| Client | Dropdown | Client pulled from SharePoint | ✓ |
| Employment Type | Dropdown | C2C, W2 Hourly, or Full-Time | ✓ |
| Discount % | Input + Dropdown | Discount percentage (0-100) | ✗ |
| Target Bill Rate | Number | Hourly or annual rate to bill client | ✓ |
| Target Pay Rate | Number | Hourly or annual rate to pay resource | ✓ |
| Target GP % | Number | Target gross profit percentage | ✓ |

## Calculated Outputs

| Metric | Description | Formula |
|--------|-------------|---------|
| **Potential Monthly Commission** | Expected monthly revenue or commission | Bill Rate × Hours Per Month |
| **Markup %** | Markup percentage on cost | ((Bill Rate - Pay Rate) / Bill Rate) × 100 |
| **Bill Rate** | Final bill rate after discount applied | Target Bill Rate × (1 - Discount %) |
| **Pay Rate** | Resource pay rate | Target Pay Rate |
| **Gross Profit** | Profit per unit (hourly or monthly) | Bill Rate - Pay Rate |
| **GP/Hour** | Gross profit per hour | Gross Profit / 173.2 hours/month |

## Usage

### For Users

1. Navigate to **Rate Calculator** in the main navigation
2. Select a **Client** from the dropdown
3. Choose the **Employment Type** (C2C, W2 Hourly, Full-Time)
4. Set the **Target Bill Rate** (hourly or annual)
5. Set the **Target Pay Rate** (hourly or annual)
6. Enter **Target GP %** (optional)
7. Select or enter a **Discount %**
8. Review calculated results instantly

### For Administrators

#### Configuration

1. **Environment Setup**
   ```bash
   SHAREPOINT_SITE_ID=your-site-id
   SHAREPOINT_CLIENTS_LIST_ID=your-list-id
   SHAREPOINT_DISCOUNTS_LIST_ID=your-list-id
   ```

2. **Create SharePoint Lists**
   - **Clients List**: Title (Name), Email, Contact
   - **Discounts List**: Title (Name), Value (percentage)

3. **Grant Permissions**
   - Ensure app has `Sites.Read.All` permission for SharePoint
   - Users need read access to both lists

## Technical Details

### Frontend Components

- **RateCalculator.jsx** - Main component with form and calculations
- **RateCalculator.css** - Responsive styling
- Located in: `/frontend/src/pages/`

### Backend Services

- **rateCalculatorService.js** - Handles SharePoint data fetching via Graph API
- **rateCalculator.js** (routes) - Express routes for API endpoints
- Located in: `/backend/src/`

### API Endpoints

```
GET /api/rate-calculator/clients      - Get all clients from SharePoint
GET /api/rate-calculator/discounts    - Get all discounts from SharePoint
```

Both endpoints require authentication (Bearer token).

## Calculations Explained

### Monthly Commission
- **C2C**: Bill Rate × 173.2 hours (estimated monthly hours)
- **W2 Hourly**: Gross Profit × 173.2 hours
- **Full-Time**: Bill Rate (as provided)

### Markup Percentage
Shows the profit margin on each billing dollar:
```
Markup % = ((Bill Rate - Pay Rate) / Bill Rate) × 100
```

### Monthly Hours
Calculated as: 40 hours/week × 4.33 weeks/month = **173.2 hours/month**

### Gross Profit per Hour
```
GP/Hour = Gross Profit / 173.2 hours/month
```

## Data Flow

```
SharePoint Lists
       ↓
Microsoft Graph API
       ↓
Rate Calculator Service (Backend)
       ↓
Express API Endpoints
       ↓
Rate Calculator API Service (Frontend)
       ↓
React Component (Frontend UI)
```

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Responsive design for tablets/mobile

## Notes

- All calculations are real-time and update instantly
- No data is persisted - it's calculated on-demand
- Discount application is cumulative with the bill rate
- Hours calculations assume standard US work week (40 hours)
- All monetary values are formatted to 2 decimal places

## Future Enhancements

- 📊 Export calculations to Excel
- 💾 Save calculation templates
- 📈 Historical rate tracking
- 🔄 Bulk rate calculations
- 📱 Mobile app support
- 🌍 Multi-currency support

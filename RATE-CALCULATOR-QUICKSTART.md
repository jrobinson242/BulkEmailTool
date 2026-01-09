# Rate Calculator - Quick Start Guide

## 🚀 For Developers

### Installation (5 minutes)

1. **Backend files already created** ✅
   - `backend/src/routes/rateCalculator.js`
   - `backend/src/services/rateCalculatorService.js`
   - Updated `backend/src/server.js`

2. **Frontend files already created** ✅
   - `frontend/src/pages/RateCalculator.jsx`
   - `frontend/src/styles/RateCalculator.css`
   - Updated `frontend/src/App.jsx` and `Navbar.jsx`
   - Updated `frontend/src/services/api.jsx`

3. **Add environment variables to `.env`:**
   ```
   SHAREPOINT_SITE_ID=your-site-id
   SHAREPOINT_CLIENTS_LIST_ID=your-list-id
   SHAREPOINT_DISCOUNTS_LIST_ID=your-list-id
   ```

4. **Restart backend and frontend servers**
   ```bash
   # Backend
   npm restart

   # Frontend (in another terminal)
   npm run dev
   ```

5. **Visit the app**
   - Go to http://localhost:3000
   - You'll see "Rate Calculator" in the navigation menu

### Testing Without SharePoint (Mock Data)

To test without setting up SharePoint, temporarily modify `rateCalculatorService.js`:

```javascript
async function getClients(user) {
  // Mock data for testing
  return [
    { id: '1', name: 'Acme Corporation', email: 'contact@acme.com', contact: 'John Smith' },
    { id: '2', name: 'TechCorp Inc', email: 'hr@techcorp.com', contact: 'Jane Doe' },
    { id: '3', name: 'Global Solutions', email: 'info@global.com', contact: 'Bob Johnson' }
  ];
}

async function getDiscounts(user) {
  // Mock data for testing
  return [
    { id: '1', name: 'Volume Discount', value: 5 },
    { id: '2', name: 'Long-term Discount', value: 10 },
    { id: '3', name: 'Q1 Special', value: 15 }
  ];
}
```

---

## 👥 For End Users

### Getting Started

1. **Navigate to Rate Calculator**
   - Click "Rate Calculator" in the top navigation bar

2. **Fill in the inputs:**
   - **Client**: Select from dropdown (pulled from your company's SharePoint)
   - **Employment Type**: Choose C2C, W2 Hourly, or Full-Time
   - **Target Bill Rate**: What you want to bill the client (hourly or annual)
   - **Target Pay Rate**: What you want to pay the resource (hourly or annual)
   - **Target GP %**: Your target gross profit percentage
   - **Discount %**: Apply a discount to the bill rate (optional)

3. **Review the results**
   - All values calculate automatically as you type
   - Results appear on the right side of the screen

### Understanding the Results

| Metric | What it means |
|--------|---------------|
| **Potential Monthly Commission** | Expected monthly revenue from this arrangement |
| **Markup %** | Your profit margin (higher is better) |
| **Bill Rate** | The rate after any discounts applied |
| **Pay Rate** | What you're paying the resource |
| **Gross Profit** | The difference (your profit per unit) |
| **GP/Hour** | Gross profit per working hour (173.2 hours/month) |

### Example Scenario

```
Client: Acme Corporation
Employment: C2C (Contractor)
Bill Rate: $75/hour
Pay Rate: $50/hour
Discount: 10% (from "Volume Discount")

Results:
├─ Monthly Commission: $12,990 (likely revenue)
├─ Markup: 33.33% (profit margin)
├─ Bill Rate: $67.50 (after 10% discount)
├─ Pay Rate: $50.00
├─ Gross Profit: $17.50/hour
└─ GP/Hour: $17.50/hour
```

### Tips & Tricks

- **Quick discounts**: Use the "Quick Select" dropdown instead of typing
- **Try different rates**: Experiment with different bill/pay rates to see impact
- **Print results**: Use your browser's print function to save calculations
- **Email scenarios**: Take screenshots to share rate proposals

---

## 📋 For Administrators

### Setup Checklist

- [ ] Create Clients list in SharePoint
- [ ] Create Discounts list in SharePoint
- [ ] Get SharePoint Site ID
- [ ] Get Clients List ID
- [ ] Get Discounts List ID
- [ ] Add environment variables to `.env` file
- [ ] Ensure app has `Sites.Read.All` permission
- [ ] Restart backend server
- [ ] Test via browser
- [ ] Test API endpoints with curl/Postman
- [ ] Set up user permissions for lists
- [ ] Train users on how to use the tool

### Creating SharePoint Lists

#### Clients List
1. Go to your SharePoint site
2. Click "+ New" → "List"
3. Name it "Clients"
4. Add columns:
   - **Title** (default, for client name)
   - **Email** (single line text)
   - **Contact** (single line text)
5. Add some sample clients
6. Copy the list ID from the URL

#### Discounts List
1. Click "+ New" → "List"
2. Name it "Discounts"
3. Add columns:
   - **Title** (default, for discount name)
   - **Value** (number, for percentage)
4. Add discount options:
   - Volume Discount: 5%
   - Long-term: 10%
   - Q1 Special: 15%
5. Copy the list ID from the URL

### Finding SharePoint IDs

**From URL:**
1. Open your SharePoint site
2. Go to Clients list
3. URL looks like: `https://yourtenant.sharepoint.com/sites/YourSite/Lists/Clients/AllItems.aspx?id=123`
4. Extract IDs using Microsoft Graph

**Using Graph API (Recommended):**
```bash
# Get Site ID
az graph query --query "sites?search=*yoursite*"

# Get List IDs
az graph query --query "/sites/{SITE_ID}/lists"
```

### Monitoring & Maintenance

- **Check logs** for API errors: `backend/logs/`
- **Monitor usage** via application analytics
- **Update discounts** as business needs change
- **Add clients** to SharePoint as new opportunities arise

### Support & Troubleshooting

See [RATE-CALCULATOR.md](../docs/RATE-CALCULATOR.md) for detailed documentation
See [rateCalculator.md](../backend/src/config/rateCalculator.md) for configuration help

---

## 🐛 Common Issues & Solutions

### Issue: "Rate Calculator not showing in menu"
**Solution**: Check that frontend server restarted and has latest code

### Issue: "Getting error when loading data"
**Solution**: Verify SharePoint IDs in `.env` are correct and API has permissions

### Issue: "Calculations not updating"
**Solution**: Make sure you're using Chrome/Firefox, not an older browser

### Issue: "Can't find SharePoint lists"
**Solution**: Lists must exist in SharePoint and be named exactly "Clients" and "Discounts"

---

## 📞 Need Help?

1. Check the documentation files:
   - [RATE-CALCULATOR.md](../docs/RATE-CALCULATOR.md)
   - [rateCalculator.md](../backend/src/config/rateCalculator.md)
   - [.env.example-rate-calculator](./.env.example-rate-calculator)

2. Review server logs:
   ```bash
   tail -f backend/logs/app.log
   ```

3. Test API endpoints:
   ```bash
   curl http://localhost:5000/api/rate-calculator/clients \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

4. Check browser console for errors (F12 → Console)

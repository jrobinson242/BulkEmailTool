import React, { useEffect, useState } from 'react';
import { rateCalculatorAPI } from '../services/api.jsx';
import '../styles/RateCalculator.css';

const RateCalculator = () => {
  const [clients, setClients] = useState([]);
  const [discounts, setDiscounts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [formData, setFormData] = useState({
    client: '',
    employmentType: 'c2c',
    discount: '',
    targetBillRate: '',
    targetPayRate: '',
    targetGP: ''
  });

  const [calculations, setCalculations] = useState({
    monthlyCommission: 0,
    markupPercent: 0,
    billRate: 0,
    payRate: 0,
    loadedCost: 0,
    gpPercent: 0,
    grossProfit: 0,
    gpPerHour: 0
  });

  useEffect(() => {
    loadClientAndDiscountData();
  }, []);

  const loadClientAndDiscountData = async () => {
    try {
      setLoading(true);
      const [clientsResponse, discountsResponse] = await Promise.all([
        rateCalculatorAPI.getClients(),
        rateCalculatorAPI.getDiscounts()
      ]);
      setClients(clientsResponse.data || []);
      setDiscounts(discountsResponse.data || []);
    } catch (err) {
      console.error('Failed to load calculator data', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateValues = (data) => {
    let billRate = parseFloat(data.targetBillRate) || 0;
    let payRate = parseFloat(data.targetPayRate) || 0;
    const discount = parseFloat(data.discount) || 0;
    const targetGP = parseFloat(data.targetGP) || 0;

    // Loaded cost is 18% on top of pay rate (benefits, taxes, etc.)
    const LOADED_COST_MULTIPLIER = 1.18;
    let loadedCost = payRate * LOADED_COST_MULTIPLIER;

    // Calculate missing values based on what's provided
    // If pay rate is empty but bill rate and GP% are provided
    if (payRate === 0 && billRate > 0 && targetGP > 0) {
      // GP% = (Bill Rate - Loaded Cost) / Bill Rate × 100
      // Loaded Cost = Bill Rate × (1 - GP% / 100)
      loadedCost = billRate * (1 - targetGP / 100);
      payRate = loadedCost / LOADED_COST_MULTIPLIER;
    }

    // If bill rate is empty but pay rate and GP% are provided
    if (billRate === 0 && payRate > 0 && targetGP > 0) {
      // Bill Rate = Loaded Cost / (1 - GP% / 100)
      loadedCost = payRate * LOADED_COST_MULTIPLIER;
      billRate = loadedCost / (1 - targetGP / 100);
    }

    // Recalculate loaded cost if pay rate was updated
    loadedCost = payRate * LOADED_COST_MULTIPLIER;

    // Calculate Markup % = ((Bill Rate - Pay Rate) / Pay Rate) × 100
    let markupPercent = 0;
    if (payRate > 0) {
      markupPercent = ((billRate - payRate) / payRate) * 100;
    }

    // Calculate GP% = (Bill Rate - Loaded Cost) / Bill Rate × 100
    let gpPercent = 0;
    if (billRate > 0) {
      gpPercent = ((billRate - loadedCost) / billRate) * 100;
    }

    // Calculate gross profit (Bill Rate - Loaded Cost)
    const grossProfit = billRate - loadedCost;

    // Calculate GP per hour (assuming 40-hour work week, 4.33 weeks per month)
    const hoursPerMonth = 40 * 4.33;
    const gpPerHour = hoursPerMonth > 0 ? grossProfit / hoursPerMonth : 0;

    // Calculate potential monthly commission based on gross profit
    const monthlyCommission = grossProfit * hoursPerMonth;

    // Apply discount
    const finalBillRate = billRate * (1 - discount / 100);

    setCalculations({
      monthlyCommission: Math.round(monthlyCommission * 100) / 100,
      markupPercent: Math.round(markupPercent * 100) / 100,
      billRate: Math.round(finalBillRate * 100) / 100,
      payRate: Math.round(payRate * 100) / 100,
      loadedCost: Math.round(loadedCost * 100) / 100,
      gpPercent: Math.round(gpPercent * 100) / 100,
      grossProfit: Math.round(grossProfit * 100) / 100,
      gpPerHour: Math.round(gpPerHour * 100) / 100
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const updatedData = { ...formData, [name]: value };
    setFormData(updatedData);
    calculateValues(updatedData);
  };

  const handleDiscountSelect = (e) => {
    const selectedDiscount = e.target.value;
    const updatedData = { ...formData, discount: selectedDiscount };
    setFormData(updatedData);
    calculateValues(updatedData);
  };

  if (loading) return <div className="loading">Loading calculator...</div>;

  return (
    <div className="container">
      <h1>Rate Calculator</h1>

      <div className="calculator-wrapper">
        <div className="calculator-inputs card">
          <h2>Input Parameters</h2>
          <form className="calculator-form">
            <div className="form-group">
              <label htmlFor="client">Client *</label>
              <select
                id="client"
                name="client"
                value={formData.client}
                onChange={handleInputChange}
                required
              >
                <option value="">Select a client...</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="employmentType">Employment Type *</label>
              <select
                id="employmentType"
                name="employmentType"
                value={formData.employmentType}
                onChange={handleInputChange}
                required
              >
                <option value="c2c">C2C (Contractor)</option>
                <option value="w2 hourly">W2 Hourly</option>
                <option value="fulltime">Full-Time</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="discount">Discount %</label>
              <div className="discount-input-group">
                <input
                  type="number"
                  id="discount"
                  name="discount"
                  value={formData.discount}
                  onChange={handleInputChange}
                  placeholder="Enter discount %"
                  min="0"
                  max="100"
                  step="0.1"
                />
                {discounts.length > 0 && (
                  <>
                    <span className="separator">or</span>
                    <select
                      className="discount-select"
                      value=""
                      onChange={handleDiscountSelect}
                    >
                      <option value="">Quick Select...</option>
                      {discounts.map((discount) => (
                        <option key={discount.id} value={discount.value}>
                          {discount.name} ({discount.value}%)
                        </option>
                      ))}
                    </select>
                  </>
                )}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="targetBillRate">Target Bill Rate ($)</label>
              <input
                type="number"
                id="targetBillRate"
                name="targetBillRate"
                value={formData.targetBillRate}
                onChange={handleInputChange}
                placeholder="Enter bill rate (or leave blank to calculate)"
                min="0"
                step="0.01"
              />
            </div>

            <div className="form-group">
              <label htmlFor="targetPayRate">Target Pay Rate ($)</label>
              <input
                type="number"
                id="targetPayRate"
                name="targetPayRate"
                value={formData.targetPayRate}
                onChange={handleInputChange}
                placeholder="Enter pay rate (or leave blank to calculate)"
                min="0"
                step="0.01"
              />
            </div>

            <div className="form-group">
              <label htmlFor="targetGP">Target GP % (Gross Profit %)</label>
              <input
                type="number"
                id="targetGP"
                name="targetGP"
                value={formData.targetGP}
                onChange={handleInputChange}
                placeholder="Enter target GP %"
                min="0"
                max="100"
                step="0.1"
              />
            </div>
          </form>
        </div>

        <div className="calculator-outputs card">
          <h2>Calculated Results</h2>
          <div className="results-grid">
            <div className="result-item">
              <label>Potential Monthly Commission</label>
              <div className="result-value">${calculations.monthlyCommission.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            </div>

            <div className="result-item">
              <label>Markup % ((Bill - Pay) / Pay)</label>
              <div className="result-value">{calculations.markupPercent.toFixed(2)}%</div>
            </div>

            <div className="result-item">
              <label>Bill Rate (after discount)</label>
              <div className="result-value">${calculations.billRate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            </div>

            <div className="result-item">
              <label>Pay Rate</label>
              <div className="result-value">${calculations.payRate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            </div>

            <div className="result-item">
              <label>Loaded Cost (+18%)</label>
              <div className="result-value">${calculations.loadedCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            </div>

            <div className="result-item">
              <label>GP %</label>
              <div className="result-value">{calculations.gpPercent.toFixed(2)}%</div>
            </div>

            <div className="result-item">
              <label>Gross Profit per Hour</label>
              <div className="result-value">${calculations.grossProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            </div>

          </div>

          <div className="calculation-notes">
            <p><strong>Notes:</strong></p>
            <ul>
              <li><strong>Loaded Cost:</strong> Pay Rate × 1.18 (includes 18% for benefits, taxes, overhead)</li>
              <li><strong>Markup %:</strong> ((Bill Rate - Pay Rate) / Pay Rate) × 100 = markup over pay</li>
              <li><strong>GP %:</strong> (Bill Rate - Loaded Cost) / Bill Rate × 100 = profit margin on the bill</li>
              <li><strong>Gross Profit:</strong> Bill Rate - Loaded Cost = total profit dollars</li>
              <li><strong>Smart Calculation:</strong> Enter any two of (Bill Rate, Pay Rate, GP%) and the third will be calculated</li>
              <li>Monthly hours calculated as 40 hours/week × 4.33 weeks/month = 173.2 hours</li>
              <li>Discount % is applied to the final bill rate</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RateCalculator;

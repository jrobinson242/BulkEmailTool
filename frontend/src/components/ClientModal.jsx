import React, { useState } from 'react';
import { rateClientsAPI } from '../services/rateClientsAPI';
import '../styles/ClientModal.css';

const ClientModal = ({ isOpen, onClose, onClientCreated }) => {
  const [activeTab, setActiveTab] = useState('add'); // 'add', 'edit', or 'upload'
  const [formData, setFormData] = useState({
    title: '',
    msp: '',
    tool: '',
    mspFee: '',
    otherDiscounts: '',
    totalDiscounts: '',
    markupW2: '',
    markupC2C: '',
    c2cFriendly: '',
    conversionMaxLength: '',
    startingFee: '',
    otRate: ''
  });
  const [csvFile, setCSVFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [clients, setClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const loadClients = async () => {
    try {
      setLoading(true);
      const response = await rateClientsAPI.getClients();
      setClients(response.data || []);
    } catch (err) {
      setError('Failed to load clients');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setError('');
    setSuccessMessage('');
    if (tab === 'edit' && clients.length === 0) {
      loadClients();
    }
  };

  const handleClientSelect = (e) => {
    const clientId = e.target.value;
    setSelectedClientId(clientId);
    
    if (clientId) {
      const client = clients.find(c => c.ClientId === parseInt(clientId));
      if (client) {
        setFormData({
          title: client.Title || '',
          msp: client.MSP || '',
          tool: client.Tool || '',
          mspFee: client.MSPFee || '',
          otherDiscounts: client.OtherDiscounts || '',
          totalDiscounts: client.TotalDiscounts || '',
          markupW2: client.MarkupW2 || '',
          markupC2C: client.MarkupC2C || '',
          c2cFriendly: client.C2CFriendly || '',
          conversionMaxLength: client.ConversionMaxLength || '',
          startingFee: client.StartingFee || '',
          otRate: client.OTRate || ''
        });
      }
    } else {
      setFormData({
        title: '',
        msp: '',
        tool: '',
        mspFee: '',
        otherDiscounts: '',
        totalDiscounts: '',
        markupW2: '',
        markupC2C: '',
        c2cFriendly: '',
        conversionMaxLength: '',
        startingFee: '',
        otRate: ''
      });
    }
  };

  const handleAddClient = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setError('Client title is required');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await rateClientsAPI.createClient(formData);
      setSuccessMessage('Client added successfully!');
      setFormData({
        title: '',
        msp: '',
        tool: '',
        mspFee: '',
        otherDiscounts: '',
        totalDiscounts: '',
        markupW2: '',
        markupC2C: '',
        c2cFriendly: '',
        conversionMaxLength: '',
        startingFee: '',
        otRate: ''
      });
      setTimeout(() => {
        setSuccessMessage('');
        onClientCreated();
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create client');
    } finally {
      setLoading(false);
    }
  };

  const handleEditClient = async (e) => {
    e.preventDefault();
    if (!selectedClientId) {
      setError('Please select a client to edit');
      return;
    }
    if (!formData.title.trim()) {
      setError('Client title is required');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await rateClientsAPI.updateClient(selectedClientId, formData);
      setSuccessMessage('Client updated successfully!');
      await loadClients(); // Reload clients to show updated data
      setTimeout(() => {
        setSuccessMessage('');
        onClientCreated();
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update client');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadCSV = async (e) => {
    e.preventDefault();
    if (!csvFile) {
      setError('Please select a CSV file');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const response = await rateClientsAPI.uploadClientsFromCSV(csvFile);
      const { imported, total, errors } = response.data;
      
      if (errors.length > 0) {
        setError(`Imported ${imported}/${total} clients. Errors: ${errors.join('; ')}`);
      } else {
        setSuccessMessage(`Successfully imported ${imported} clients!`);
      }
      
      setCSVFile(null);
      // Clear file input
      const fileInput = document.querySelector('input[type="file"]');
      if (fileInput) fileInput.value = '';
      
      setTimeout(() => {
        setSuccessMessage('');
        setError('');
        onClientCreated();
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to upload CSV');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Manage Clients</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-tabs">
          <button
            className={`tab-btn ${activeTab === 'add' ? 'active' : ''}`}
            onClick={() => handleTabChange('add')}
          >
            Add Client
          </button>
          <button
            className={`tab-btn ${activeTab === 'edit' ? 'active' : ''}`}
            onClick={() => handleTabChange('edit')}
          >
            Edit Client
          </button>
          <button
            className={`tab-btn ${activeTab === 'upload' ? 'active' : ''}`}
            onClick={() => handleTabChange('upload')}
          >
            Upload CSV
          </button>
        </div>

        <div className="modal-body">
          {error && <div className="alert alert-error">{error}</div>}
          {successMessage && <div className="alert alert-success">{successMessage}</div>}

          {activeTab === 'add' && (
            <form onSubmit={handleAddClient}>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="title">Client Title *</label>
                  <input
                    type="text"
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    placeholder="Enter client name"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="msp">MSP</label>
                  <input
                    type="text"
                    id="msp"
                    name="msp"
                    value={formData.msp}
                    onChange={handleInputChange}
                    placeholder="MSP name"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="tool">Tool</label>
                  <input
                    type="text"
                    id="tool"
                    name="tool"
                    value={formData.tool}
                    onChange={handleInputChange}
                    placeholder="Tool/Service"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="mspFee">MSP Fee</label>
                  <input
                    type="number"
                    id="mspFee"
                    name="mspFee"
                    value={formData.mspFee}
                    onChange={handleInputChange}
                    placeholder="0.00"
                    step="0.01"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="totalDiscounts">Total Discounts</label>
                  <input
                    type="number"
                    id="totalDiscounts"
                    name="totalDiscounts"
                    value={formData.totalDiscounts}
                    onChange={handleInputChange}
                    placeholder="0.00"
                    step="0.01"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="otherDiscounts">Other Discounts</label>
                  <input
                    type="text"
                    id="otherDiscounts"
                    name="otherDiscounts"
                    value={formData.otherDiscounts}
                    onChange={handleInputChange}
                    placeholder="Discount details"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="markupW2">Markup W2 %</label>
                  <input
                    type="number"
                    id="markupW2"
                    name="markupW2"
                    value={formData.markupW2}
                    onChange={handleInputChange}
                    placeholder="0.00"
                    step="0.01"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="markupC2C">Markup C2C %</label>
                  <input
                    type="number"
                    id="markupC2C"
                    name="markupC2C"
                    value={formData.markupC2C}
                    onChange={handleInputChange}
                    placeholder="0.00"
                    step="0.01"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="startingFee">Starting Fee</label>
                  <input
                    type="number"
                    id="startingFee"
                    name="startingFee"
                    value={formData.startingFee}
                    onChange={handleInputChange}
                    placeholder="0.00"
                    step="0.01"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="otRate">OT Rate</label>
                  <input
                    type="text"
                    id="otRate"
                    name="otRate"
                    value={formData.otRate}
                    onChange={handleInputChange}
                    placeholder="Overtime rate"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="c2cFriendly">C2C Friendly?</label>
                  <input
                    type="text"
                    id="c2cFriendly"
                    name="c2cFriendly"
                    value={formData.c2cFriendly}
                    onChange={handleInputChange}
                    placeholder="Yes/No"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="conversionMaxLength">Conversion Max Length</label>
                  <input
                    type="text"
                    id="conversionMaxLength"
                    name="conversionMaxLength"
                    value={formData.conversionMaxLength}
                    onChange={handleInputChange}
                    placeholder="Months/Duration"
                  />
                </div>
              </div>

              <button type="submit" disabled={loading} className="submit-btn">
                {loading ? 'Adding...' : 'Add Client'}
              </button>
            </form>
          )}

          {activeTab === 'edit' && (
            <form onSubmit={handleEditClient}>
              <div className="form-group">
                <label htmlFor="clientSelect">Select Client *</label>
                <select
                  id="clientSelect"
                  value={selectedClientId}
                  onChange={handleClientSelect}
                  className="client-select"
                  required
                >
                  <option value="">-- Select a client to edit --</option>
                  {clients.map(client => (
                    <option key={client.ClientId} value={client.ClientId}>
                      {client.Title}
                    </option>
                  ))}
                </select>
              </div>

              {selectedClientId && (
                <>
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="edit-title">Client Title *</label>
                      <input
                        type="text"
                        id="edit-title"
                        name="title"
                        value={formData.title}
                        onChange={handleInputChange}
                        placeholder="Enter client name"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="edit-msp">MSP</label>
                      <input
                        type="text"
                        id="edit-msp"
                        name="msp"
                        value={formData.msp}
                        onChange={handleInputChange}
                        placeholder="MSP name"
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="edit-tool">Tool</label>
                      <input
                        type="text"
                        id="edit-tool"
                        name="tool"
                        value={formData.tool}
                        onChange={handleInputChange}
                        placeholder="Tool/Service"
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="edit-mspFee">MSP Fee</label>
                      <input
                        type="number"
                        id="edit-mspFee"
                        name="mspFee"
                        value={formData.mspFee}
                        onChange={handleInputChange}
                        placeholder="0.00"
                        step="0.01"
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="edit-totalDiscounts">Total Discounts</label>
                      <input
                        type="number"
                        id="edit-totalDiscounts"
                        name="totalDiscounts"
                        value={formData.totalDiscounts}
                        onChange={handleInputChange}
                        placeholder="0.00"
                        step="0.01"
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="edit-otherDiscounts">Other Discounts</label>
                      <input
                        type="text"
                        id="edit-otherDiscounts"
                        name="otherDiscounts"
                        value={formData.otherDiscounts}
                        onChange={handleInputChange}
                        placeholder="Discount details"
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="edit-markupW2">Markup W2 %</label>
                      <input
                        type="number"
                        id="edit-markupW2"
                        name="markupW2"
                        value={formData.markupW2}
                        onChange={handleInputChange}
                        placeholder="0.00"
                        step="0.01"
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="edit-markupC2C">Markup C2C %</label>
                      <input
                        type="number"
                        id="edit-markupC2C"
                        name="markupC2C"
                        value={formData.markupC2C}
                        onChange={handleInputChange}
                        placeholder="0.00"
                        step="0.01"
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="edit-startingFee">Starting Fee</label>
                      <input
                        type="number"
                        id="edit-startingFee"
                        name="startingFee"
                        value={formData.startingFee}
                        onChange={handleInputChange}
                        placeholder="0.00"
                        step="0.01"
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="edit-otRate">OT Rate</label>
                      <input
                        type="text"
                        id="edit-otRate"
                        name="otRate"
                        value={formData.otRate}
                        onChange={handleInputChange}
                        placeholder="Overtime rate"
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="edit-c2cFriendly">C2C Friendly?</label>
                      <input
                        type="text"
                        id="edit-c2cFriendly"
                        name="c2cFriendly"
                        value={formData.c2cFriendly}
                        onChange={handleInputChange}
                        placeholder="Yes/No"
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="edit-conversionMaxLength">Conversion Max Length</label>
                      <input
                        type="text"
                        id="edit-conversionMaxLength"
                        name="conversionMaxLength"
                        value={formData.conversionMaxLength}
                        onChange={handleInputChange}
                        placeholder="Months/Duration"
                      />
                    </div>
                  </div>

                  <button type="submit" disabled={loading} className="submit-btn">
                    {loading ? 'Updating...' : 'Update Client'}
                  </button>
                </>
              )}
            </form>
          )}

          {activeTab === 'upload' && (
            <form onSubmit={handleUploadCSV}>
              <div className="form-group">
                <label htmlFor="csvFile">CSV File</label>
                <p className="csv-hint">
                  Upload a CSV file with headers. Example format:<br/>
                  Title,MSP,Tool,MarkupW2,MarkupC2C,StartingFee<br/>
                  Acme Corp,MSP1,Tool1,30,45,5000<br/>
                  TechCorp,MSP2,Tool2,25,40,4000
                </p>
                <input
                  type="file"
                  id="csvFile"
                  accept=".csv"
                  onChange={(e) => setCSVFile(e.target.files[0])}
                  className="file-input"
                />
                {csvFile && (
                  <p className="file-selected">Selected: {csvFile.name}</p>
                )}
              </div>

              <button type="submit" disabled={loading} className="submit-btn">
                {loading ? 'Uploading...' : 'Import Clients'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClientModal;

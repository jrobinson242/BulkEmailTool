import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { campaignsAPI, templatesAPI, contactsAPI } from '../services/api.jsx';

const Campaigns = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    templateId: '',
    contactIds: []
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [campaignsRes, templatesRes, contactsRes] = await Promise.all([
        campaignsAPI.getAll(),
        templatesAPI.getAll(),
        contactsAPI.getAll()
      ]);
      setCampaigns(campaignsRes.data);
      setTemplates(templatesRes.data);
      setContacts(contactsRes.data);
    } catch (err) {
      console.error('Failed to load data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await campaignsAPI.create(formData);
      setShowForm(false);
      setFormData({ name: '', templateId: '', contactIds: [] });
      await loadData();
    } catch (err) {
      alert('Failed to create campaign');
    }
  };

  const handleSend = async (id) => {
    if (window.confirm('Are you sure you want to send this campaign?')) {
      try {
        await campaignsAPI.send(id);
        alert('Campaign queued for sending!');
        await loadData();
      } catch (err) {
        alert('Failed to send campaign: ' + err.response?.data?.error);
      }
    }
  };

  const handleStop = async (id) => {
    if (window.confirm('Are you sure you want to stop this campaign?')) {
      try {
        await campaignsAPI.stop(id);
        alert('Campaign stopped successfully!');
        await loadData();
      } catch (err) {
        alert('Failed to stop campaign: ' + err.response?.data?.error);
      }
    }
  };

  const toggleContact = (contactId) => {
    setFormData(prev => ({
      ...prev,
      contactIds: prev.contactIds.includes(contactId)
        ? prev.contactIds.filter(id => id !== contactId)
        : [...prev.contactIds, contactId]
    }));
  };

  const selectAll = () => {
    setFormData(prev => ({
      ...prev,
      contactIds: contacts.map(c => c.ContactId)
    }));
  };

  if (loading) return <div className="loading">Loading campaigns...</div>;

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>Campaigns</h1>
        <button onClick={() => setShowForm(!showForm)} className="btn btn-primary">
          {showForm ? 'Cancel' : 'New Campaign'}
        </button>
      </div>

      {showForm && (
        <div className="card">
          <h2>Create Campaign</h2>
          <form onSubmit={handleSubmit}>
            <input
              type="text"
              placeholder="Campaign Name *"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            
            <select
              required
              value={formData.templateId}
              onChange={(e) => setFormData({ ...formData, templateId: e.target.value })}
            >
              <option value="">Select Template *</option>
              {templates.map(t => (
                <option key={t.TemplateId} value={t.TemplateId}>{t.Name}</option>
              ))}
            </select>

            <div style={{ margin: '20px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <label><strong>Select Contacts ({formData.contactIds.length} selected)</strong></label>
                <button type="button" onClick={selectAll} className="btn btn-secondary" style={{ padding: '5px 15px' }}>
                  Select All
                </button>
              </div>
              <div style={{ maxHeight: '200px', overflow: 'auto', border: '1px solid #ddd', borderRadius: '4px', padding: '10px' }}>
                {contacts.map(contact => (
                  <div key={contact.ContactId} style={{ padding: '5px 0' }}>
                    <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                      <input
                        type="checkbox"
                        checked={formData.contactIds.includes(contact.ContactId)}
                        onChange={() => toggleContact(contact.ContactId)}
                        style={{ marginRight: '10px', width: 'auto' }}
                      />
                      {contact.FirstName} {contact.LastName} ({contact.Email})
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <button type="submit" className="btn btn-primary">Create Campaign</button>
          </form>
        </div>
      )}

      <div className="card">
        <h2>Campaign List ({campaigns.length})</h2>
        {campaigns.length === 0 ? (
          <p>No campaigns found. Create your first campaign to get started.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Template</th>
                <th>Status</th>
                <th>Sent</th>
                <th>Success</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((campaign) => (
                <tr key={campaign.CampaignId}>
                  <td><strong>{campaign.Name}</strong></td>
                  <td>{campaign.TemplateName}</td>
                  <td>
                    <span style={{ 
                      padding: '4px 8px', 
                      borderRadius: '4px', 
                      fontSize: '12px',
                      backgroundColor: campaign.Status === 'sent' ? '#d4edda' : '#fff3cd'
                    }}>
                      {campaign.Status}
                    </span>
                  </td>
                  <td>{campaign.TotalSent || 0}</td>
                  <td>{campaign.SuccessCount || 0}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <Link to={`/campaigns/${campaign.CampaignId}`} className="btn btn-secondary" style={{ padding: '5px 10px', fontSize: '12px' }}>
                        View
                      </Link>
                      {campaign.Status === 'draft' && (
                        <button 
                          onClick={() => handleSend(campaign.CampaignId)} 
                          className="btn btn-primary"
                          style={{ padding: '5px 10px', fontSize: '12px' }}
                        >
                          Send
                        </button>
                      )}
                      {campaign.Status === 'sending' && (
                        <button 
                          onClick={() => handleStop(campaign.CampaignId)} 
                          className="btn btn-danger"
                          style={{ padding: '5px 10px', fontSize: '12px' }}
                        >
                          Stop
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Campaigns;

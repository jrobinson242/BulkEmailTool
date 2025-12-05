import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { campaignsAPI, templatesAPI, contactsAPI } from '../services/api.jsx';

const Campaigns = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [creatingTemplate, setCreatingTemplate] = useState(false);
  const [newTemplate, setNewTemplate] = useState({ name: '', subject: '', body: '', isGlobal: false });
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

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this campaign? This action cannot be undone.')) {
      try {
        await campaignsAPI.delete(id);
        alert('Campaign deleted successfully!');
        await loadData();
      } catch (err) {
        alert('Failed to delete campaign: ' + err.response?.data?.error);
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
  const handleTemplateChange = (e) => {
    const value = e.target.value;
    if (value === 'CREATE_NEW') {
      setShowTemplateForm(true);
      setFormData({ ...formData, templateId: '' });
    } else {
      setFormData({ ...formData, templateId: value });
    }
  };

  const handleCreateTemplate = async (e) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent parent form submission
    
    // Validate body has actual content (not just empty HTML tags)
    const strippedBody = newTemplate.body.replace(/<[^>]*>/g, '').trim();
    if (!strippedBody) {
      alert('Please enter email body content');
      return;
    }
    
    if (!newTemplate.name || !newTemplate.subject) {
      alert('Please fill in all required fields');
      return;
    }
    
    try {
      setCreatingTemplate(true);
      console.log('Creating template:', newTemplate);
      const response = await templatesAPI.create(newTemplate);
      console.log('Template created:', response.data);
      await loadData();
      setFormData({ ...formData, templateId: response.data.TemplateId });
      setShowTemplateForm(false);
      setNewTemplate({ name: '', subject: '', body: '', isGlobal: false });
      alert('Template created successfully!');
    } catch (err) {
      console.error('Template creation error:', err);
      alert('Failed to create template: ' + (err.response?.data?.error || err.message));
    } finally {
      setCreatingTemplate(false);
    }
  };

  const handleCancelTemplateCreation = () => {
    setShowTemplateForm(false);
    setNewTemplate({ name: '', subject: '', body: '', isGlobal: false });
  };

  if (loading) return <div className="loading">Loading campaigns...</div>;

  return (
    <div className="container">
      {/* Template Creation Modal */}
      {showTemplateForm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '8px',
            maxWidth: '800px',
            width: '90%',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '20px' }}>Create New Template</h3>
            <form onSubmit={handleCreateTemplate}>
              <input
                type="text"
                placeholder="Template Name *"
                required
                value={newTemplate.name}
                onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                style={{ marginBottom: '10px' }}
              />
              <input
                type="text"
                placeholder="Email Subject *"
                required
                value={newTemplate.subject}
                onChange={(e) => setNewTemplate({ ...newTemplate, subject: e.target.value })}
                style={{ marginBottom: '10px' }}
              />
              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Email Body *</label>
                <ReactQuill
                  theme="snow"
                  value={newTemplate.body}
                  onChange={(content) => setNewTemplate({ ...newTemplate, body: content })}
                  modules={{
                    toolbar: [
                      [{ 'header': [1, 2, 3, false] }],
                      ['bold', 'italic', 'underline', 'strike'],
                      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                      [{ 'color': [] }, { 'background': [] }],
                      [{ 'align': [] }],
                      ['link', 'image'],
                      ['clean']
                    ]
                  }}
                  style={{ backgroundColor: 'white', minHeight: '200px' }}
                  placeholder="Type your email content here... Use {{FirstName}}, {{LastName}}, {{Email}}, {{Company}}, {{JobTitle}} for personalization"
                />
              </div>
              <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#e7f3ff', borderRadius: '4px', fontSize: '14px', marginBottom: '15px' }}>
                <strong>Available Placeholders:</strong> <code>{'{{FirstName}}, {{LastName}}, {{Email}}, {{Company}}, {{JobTitle}}'}</code>
              </div>
              <div style={{ textAlign: 'left', marginBottom: '15px' }}>
                <label style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}>
                  <input
                    type="checkbox"
                    checked={newTemplate.isGlobal}
                    onChange={(e) => setNewTemplate({ ...newTemplate, isGlobal: e.target.checked })}
                  />
                  <span>Make this template global (visible to all users)</span>
                </label>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit" className="btn btn-primary" disabled={creatingTemplate}>
                  {creatingTemplate ? 'Creating...' : 'Create Template'}
                </button>
                <button type="button" onClick={handleCancelTemplateCreation} className="btn btn-secondary">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
              onChange={handleTemplateChange}
            >
              <option value="">Select Template *</option>
              {templates.map(t => (
                <option key={t.TemplateId} value={t.TemplateId}>{t.Name}</option>
              ))}
              <option value="CREATE_NEW" style={{ fontWeight: 'bold', color: '#007bff' }}>+ Create New Template</option>
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
                      <button 
                        onClick={() => handleDelete(campaign.CampaignId)} 
                        className="btn btn-danger"
                        style={{ padding: '5px 10px', fontSize: '12px' }}
                      >
                        Delete
                      </button>
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

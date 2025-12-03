import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { campaignsAPI, analyticsAPI, templatesAPI, contactsAPI } from '../services/api.jsx';

const CampaignDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState(null);
  const [stats, setStats] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [campaignContacts, setCampaignContacts] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    templateId: '',
    contactIds: []
  });

  useEffect(() => {
    loadCampaignData();
  }, [id]);

  const loadCampaignData = async () => {
    try {
      setLoading(true);
      const [campaignRes, statsRes, logsRes] = await Promise.all([
        campaignsAPI.getOne(id),
        analyticsAPI.getCampaignStats(id),
        campaignsAPI.getLogs(id)
      ]);
      setCampaign(campaignRes.data);
      setStats(statsRes.data);
      setLogs(logsRes.data);
      
      setFormData({
        name: campaignRes.data.Name,
        templateId: campaignRes.data.TemplateId,
        contactIds: []
      });
    } catch (err) {
      console.error('Failed to load campaign data', err);
    } finally {
      setLoading(false);
    }
  };

  const loadEditData = async () => {
    try {
      const [templatesRes, contactsRes, campaignContactsRes] = await Promise.all([
        templatesAPI.getAll(),
        contactsAPI.getAll(),
        campaignsAPI.getContacts(id)
      ]);
      
      setTemplates(templatesRes.data);
      setContacts(contactsRes.data);
      setCampaignContacts(campaignContactsRes);
      
      setFormData(prev => ({
        ...prev,
        contactIds: campaignContactsRes.map(c => c.ContactId)
      }));
    } catch (err) {
      console.error('Failed to load edit data', err);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    loadEditData();
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setFormData({
      name: campaign.Name,
      templateId: campaign.TemplateId,
      contactIds: campaignContacts.map(c => c.ContactId)
    });
  };

  const handleSaveEdit = async () => {
    try {
      await campaignsAPI.update(id, formData);
      setIsEditing(false);
      await loadCampaignData();
      alert('Campaign updated successfully!');
    } catch (err) {
      alert('Failed to update campaign: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleStop = async () => {
    if (!window.confirm('Are you sure you want to stop this campaign? It will be reset to draft status.')) {
      return;
    }
    try {
      await campaignsAPI.stop(id);
      await loadCampaignData();
      alert('Campaign stopped successfully!');
    } catch (err) {
      alert('Failed to stop campaign: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleResend = async () => {
    if (!window.confirm('Are you sure you want to resend this campaign?')) {
      return;
    }
    try {
      await campaignsAPI.send(id);
      await loadCampaignData();
      alert('Campaign queued for sending!');
    } catch (err) {
      alert('Failed to resend campaign: ' + (err.response?.data?.error || err.message));
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

  if (loading) return <div className="loading">Loading campaign...</div>;
  if (!campaign) return <div className="error">Campaign not found</div>;

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <button onClick={() => navigate('/campaigns')} className="btn btn-secondary">
          ← Back to Campaigns
        </button>
        
        <div style={{ display: 'flex', gap: '10px' }}>
          {campaign.Status === 'sending' && (
            <button onClick={handleStop} className="btn btn-danger">
              Stop Campaign
            </button>
          )}
          
          {campaign.Status === 'draft' && !isEditing && (
            <>
              <button onClick={handleEdit} className="btn" style={{ backgroundColor: '#ffc107', color: '#000' }}>
                Edit Campaign
              </button>
              <button onClick={handleResend} className="btn btn-primary">
                Send Campaign
              </button>
            </>
          )}
        </div>
      </div>

      {isEditing ? (
        <div className="card">
          <h2>Edit Campaign</h2>
          <div>
            <label>Campaign Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div>
            <label>Template</label>
            <select
              value={formData.templateId}
              onChange={(e) => setFormData({ ...formData, templateId: e.target.value })}
            >
              {templates.map(t => (
                <option key={t.TemplateId} value={t.TemplateId}>{t.Name}</option>
              ))}
            </select>
          </div>

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

          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={handleSaveEdit} className="btn btn-primary">Save Changes</button>
            <button onClick={handleCancelEdit} className="btn btn-secondary">Cancel</button>
          </div>
        </div>
      ) : (
        <div className="card">
          <h1>{campaign.Name}</h1>
          <p><strong>Template:</strong> {campaign.TemplateName}</p>
          <p><strong>Subject:</strong> {campaign.Subject}</p>
          <p><strong>Status:</strong> {campaign.Status}</p>
        </div>
      )}

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats?.totalSent || 0}</div>
          <div className="stat-label">Total Sent</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-value">{stats?.successCount || 0}</div>
          <div className="stat-label">Successful</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-value">{stats?.openedCount || 0}</div>
          <div className="stat-label">Opened</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-value">{stats?.openRate || 0}%</div>
          <div className="stat-label">Open Rate</div>
        </div>

        <div className="stat-card">
          <div className="stat-value">{stats?.clickedCount || 0}</div>
          <div className="stat-label">Clicked</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-value">{stats?.clickRate || 0}%</div>
          <div className="stat-label">Click Rate</div>
        </div>
      </div>

      <div className="card">
        <h2>Send Log</h2>
        {logs.length === 0 ? (
          <p>No logs available.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Recipient</th>
                <th>Email</th>
                <th>Status</th>
                <th>Sent At</th>
                <th>Opened</th>
                <th>Clicked</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, index) => (
                <tr key={index}>
                  <td>{log.FirstName} {log.LastName}</td>
                  <td>{log.Email}</td>
                  <td>{log.Status}</td>
                  <td>{new Date(log.CreatedAt).toLocaleString()}</td>
                  <td>{log.Opened ? '✓' : '-'}</td>
                  <td>{log.Clicked ? '✓' : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default CampaignDetail;

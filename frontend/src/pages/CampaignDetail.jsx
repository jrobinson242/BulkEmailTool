import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { campaignsAPI, analyticsAPI, templatesAPI, contactsAPI } from '../services/api.jsx';
import ConfirmModal from '../components/ConfirmModal';
import SuccessModal from '../components/SuccessModal';

const CampaignDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState(null);
  const [stats, setStats] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [campaignContacts, setCampaignContacts] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    templateId: '',
    contactIds: []
  });
  const [showEmailContent, setShowEmailContent] = useState(false);
  const [confirmAction, setConfirmAction] = useState({ show: false, type: null });
  const [successMessage, setSuccessMessage] = useState({ show: false, title: '', message: '' });

  useEffect(() => {
    loadCampaignData();
  }, [id]);

  const loadCampaignData = async () => {
    try {
      setLoading(true);
      const [campaignRes, statsRes, logsRes, campaignContactsRes] = await Promise.all([
        campaignsAPI.getOne(id),
        analyticsAPI.getCampaignStats(id),
        campaignsAPI.getLogs(id),
        campaignsAPI.getContacts(id)
      ]);
      setCampaign(campaignRes.data);
      setStats(statsRes.data);
      setLogs(logsRes.data);
      const campaignContactsData = campaignContactsRes.data || [];
      setCampaignContacts(campaignContactsData);
      
      setFormData({
        name: campaignRes.data.Name,
        templateId: campaignRes.data.TemplateId,
        contactIds: campaignContactsData.map(c => c.ContactId)
      });
    } catch (err) {
      console.error('Failed to load campaign data', err);
    } finally {
      setLoading(false);
    }
  };

  const loadEditData = async () => {
    try {
      setEditLoading(true);
      const [templatesRes, contactsRes, campaignContactsRes] = await Promise.all([
        templatesAPI.getAll(),
        contactsAPI.getAll(),
        campaignsAPI.getContacts(id)
      ]);
      
      setTemplates(templatesRes.data);
      setContacts(contactsRes.data);
      const campaignContactsData = campaignContactsRes.data || [];
      setCampaignContacts(campaignContactsData);
      
      setFormData(prev => ({
        ...prev,
        contactIds: campaignContactsData.map(c => c.ContactId)
      }));
    } catch (err) {
      console.error('Failed to load edit data', err);
      alert('Failed to load edit data: ' + (err.response?.data?.error || err.message));
      setIsEditing(false);
    } finally {
      setEditLoading(false);
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
      setSuccessMessage({ show: true, title: 'Success', message: 'Campaign updated successfully!' });
    } catch (err) {
      alert('Failed to update campaign: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleStop = async () => {
    try {
      await campaignsAPI.stop(id);
      await loadCampaignData();
      setConfirmAction({ show: false, type: null });
      setSuccessMessage({ show: true, title: 'Success', message: 'Campaign stopped successfully!' });
    } catch (err) {
      alert('Failed to stop campaign: ' + (err.response?.data?.error || err.message));
      setConfirmAction({ show: false, type: null });
    }
  };

  const handleResend = async () => {
    try {
      await campaignsAPI.send(id);
      await loadCampaignData();
      setConfirmAction({ show: false, type: null });
      setSuccessMessage({ show: true, title: 'Success', message: 'Campaign queued for sending!' });
    } catch (err) {
      alert('Failed to resend campaign: ' + (err.response?.data?.error || err.message));
      setConfirmAction({ show: false, type: null });
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
      contactIds: (contacts || []).map(c => c.ContactId)
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
            <button onClick={() => setConfirmAction({ show: true, type: 'stop' })} className="btn btn-danger">
              Stop Campaign
            </button>
          )}
          
          {campaign.Status === 'draft' && !isEditing && (
            <>
              <button onClick={handleEdit} className="btn" style={{ backgroundColor: '#ffc107', color: '#000' }}>
                Edit Campaign
              </button>
              <button onClick={() => setConfirmAction({ show: true, type: 'resend' })} className="btn btn-primary">
                Send Campaign
              </button>
            </>
          )}
        </div>
      </div>

      {isEditing ? (
        editLoading ? (
          <div className="card">
            <div className="loading">Loading edit data...</div>
          </div>
        ) : (
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
              <option value="">Select a template</option>
              {(templates || []).map(t => (
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
              {(contacts || []).length === 0 ? (
                <p style={{ textAlign: 'center', color: '#666' }}>No contacts available. Please add or sync contacts first.</p>
              ) : (
                (contacts || []).map(contact => (
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
                ))
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={handleSaveEdit} className="btn btn-primary">Save Changes</button>
            <button onClick={handleCancelEdit} className="btn btn-secondary">Cancel</button>
          </div>
        </div>
        )
      ) : (
        <div className="card">
          <h1>{campaign.Name}</h1>
          <p><strong>Template:</strong> {campaign.TemplateName}</p>
          <p><strong>Subject:</strong> {campaign.Subject}</p>
          <p><strong>Status:</strong> {campaign.Status}</p>
        </div>
      )}

      <div className="card">
        <div 
          onClick={() => setShowEmailContent(!showEmailContent)}
          style={{ 
            cursor: 'pointer', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            padding: '10px 0',
            borderBottom: showEmailContent ? '1px solid #ddd' : 'none',
            marginBottom: showEmailContent ? '15px' : '0'
          }}
        >
          <h2 style={{ margin: 0 }}>Email Content</h2>
          <span style={{ fontSize: '1.5rem' }}>{showEmailContent ? '▼' : '▶'}</span>
        </div>
        
        {showEmailContent && (
          <div>
            <div style={{ marginBottom: '15px' }}>
              <strong>Subject:</strong> {campaign.Subject}
            </div>
            <div style={{ 
              padding: '15px', 
              border: '1px solid #ddd', 
              borderRadius: '4px',
              backgroundColor: '#f9f9f9',
              maxHeight: '500px',
              overflow: 'auto'
            }}>
              <div dangerouslySetInnerHTML={{ __html: campaign.Body }} />
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <h2>Recipients ({campaignContacts.length})</h2>
        {campaignContacts.length === 0 ? (
          <p>No recipients selected for this campaign.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Company</th>
                <th>Job Title</th>
              </tr>
            </thead>
            <tbody>
              {campaignContacts.map((contact) => (
                <tr key={contact.ContactId}>
                  <td>{contact.FirstName} {contact.LastName}</td>
                  <td>{contact.Email}</td>
                  <td>{contact.Company || '-'}</td>
                  <td>{contact.JobTitle || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

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

      <ConfirmModal
        show={confirmAction.show}
        title={
          confirmAction.type === 'stop' ? 'Stop Campaign' :
          confirmAction.type === 'resend' ? 'Send Campaign' : ''
        }
        message={
          confirmAction.type === 'stop' ? 'Are you sure you want to stop this campaign? It will be reset to draft status.' :
          confirmAction.type === 'resend' ? 'Are you sure you want to resend this campaign?' : ''
        }
        onConfirm={confirmAction.type === 'stop' ? handleStop : handleResend}
        onCancel={() => setConfirmAction({ show: false, type: null })}
        confirmText="Confirm"
        confirmStyle={confirmAction.type === 'stop' ? 'danger' : 'primary'}
      />

      <SuccessModal
        show={successMessage.show}
        title={successMessage.title}
        message={successMessage.message}
        onClose={() => setSuccessMessage({ show: false, title: '', message: '' })}
      />
    </div>
  );
};

export default CampaignDetail;

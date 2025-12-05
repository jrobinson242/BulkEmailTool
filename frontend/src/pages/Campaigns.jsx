import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { campaignsAPI, templatesAPI, contactsAPI, contactListsAPI } from '../services/api.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';
import SuccessModal from '../components/SuccessModal.jsx';

const Campaigns = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [lists, setLists] = useState([]);
  const [selectedLists, setSelectedLists] = useState([]);
  const [contactSearchQuery, setContactSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [creatingTemplate, setCreatingTemplate] = useState(false);
  const [showHtmlSource, setShowHtmlSource] = useState(false);
  const [confirmAction, setConfirmAction] = useState({ show: false, type: null, id: null });
  const [successMessage, setSuccessMessage] = useState({ show: false, title: '', message: '' });
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
      const [campaignsRes, templatesRes, contactsRes, listsRes] = await Promise.all([
        campaignsAPI.getAll(),
        templatesAPI.getAll(),
        contactsAPI.getAll(),
        contactListsAPI.getAll()
      ]);
      setCampaigns(campaignsRes.data);
      setTemplates(templatesRes.data);
      setContacts(contactsRes.data);
      setLists(listsRes.data);
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

  const handleSend = async () => {
    try {
      await campaignsAPI.send(confirmAction.id);
      setConfirmAction({ show: false, type: null, id: null });
      setSuccessMessage({ show: true, title: 'Success', message: 'Campaign queued for sending!' });
      await loadData();
    } catch (err) {
      alert('Failed to send campaign: ' + err.response?.data?.error);
      setConfirmAction({ show: false, type: null, id: null });
    }
  };

  const handleStop = async () => {
    try {
      await campaignsAPI.stop(confirmAction.id);
      setConfirmAction({ show: false, type: null, id: null });
      setSuccessMessage({ show: true, title: 'Success', message: 'Campaign stopped successfully!' });
      await loadData();
    } catch (err) {
      alert('Failed to stop campaign: ' + err.response?.data?.error);
      setConfirmAction({ show: false, type: null, id: null });
    }
  };

  const handleDelete = async () => {
    try {
      await campaignsAPI.delete(confirmAction.id);
      setConfirmAction({ show: false, type: null, id: null });
      setSuccessMessage({ show: true, title: 'Success', message: 'Campaign deleted successfully!' });
      await loadData();
    } catch (err) {
      alert('Failed to delete campaign: ' + err.response?.data?.error);
      setConfirmAction({ show: false, type: null, id: null });
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

  const toggleList = async (listId) => {
    if (selectedLists.includes(listId)) {
      // Deselect the list
      setSelectedLists(prev => prev.filter(id => id !== listId));
      // Remove contacts from this list
      try {
        const response = await contactListsAPI.getOne(listId);
        const listContacts = response.data.contacts || [];
        const listContactIds = listContacts.map(c => c.ContactId);
        setFormData(prev => ({
          ...prev,
          contactIds: prev.contactIds.filter(id => !listContactIds.includes(id))
        }));
      } catch (err) {
        console.error('Failed to load list contacts', err);
      }
    } else {
      // Select the list
      setSelectedLists(prev => [...prev, listId]);
      // Add contacts from this list
      try {
        const response = await contactListsAPI.getOne(listId);
        const listContacts = response.data.contacts || [];
        const listContactIds = listContacts.map(c => c.ContactId);
        setFormData(prev => ({
          ...prev,
          contactIds: [...new Set([...prev.contactIds, ...listContactIds])]
        }));
      } catch (err) {
        console.error('Failed to load list contacts', err);
      }
    }
  };

  const selectAllLists = async () => {
    setSelectedLists(lists.map(l => l.ListId));
    // Collect all unique contact IDs from all lists
    const allContactIds = new Set(formData.contactIds);
    for (const list of lists) {
      try {
        const response = await contactListsAPI.getOne(list.ListId);
        const listContacts = response.data.contacts || [];
        listContacts.forEach(c => allContactIds.add(c.ContactId));
      } catch (err) {
        console.error('Failed to load list contacts', err);
      }
    }
    setFormData(prev => ({
      ...prev,
      contactIds: Array.from(allContactIds)
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
      setSuccessMessage({ show: true, title: 'Success', message: 'Template created successfully!' });
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                  <label style={{ fontWeight: 'bold' }}>Email Body *</label>
                  <button 
                    type="button" 
                    onClick={() => setShowHtmlSource(!showHtmlSource)}
                    className="btn"
                    style={{ padding: '5px 15px', fontSize: '12px', backgroundColor: '#6c757d', color: 'white' }}
                  >
                    {showHtmlSource ? '📝 Visual Editor' : '< > HTML Source'}
                  </button>
                </div>
                {showHtmlSource ? (
                  <textarea
                    value={newTemplate.body}
                    onChange={(e) => setNewTemplate({ ...newTemplate, body: e.target.value })}
                    rows="15"
                    style={{ fontFamily: 'monospace', fontSize: '13px' }}
                    placeholder="Enter HTML code here..."
                  />
                ) : (
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
                )}
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
                <label><strong>Select Recipients ({formData.contactIds.length} selected)</strong></label>
              </div>

              {/* Lists Selection */}
              {lists.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                    <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Contact Lists ({selectedLists.length} selected)</label>
                    <button type="button" onClick={selectAllLists} className="btn btn-secondary" style={{ padding: '5px 15px', fontSize: '12px' }}>
                      Select All Lists
                    </button>
                  </div>
                  <div style={{ maxHeight: '150px', overflow: 'auto', border: '1px solid #ddd', borderRadius: '4px', padding: '10px', backgroundColor: '#f9f9f9' }}>
                    {lists.map(list => (
                      <div key={list.ListId} style={{ padding: '5px 0' }}>
                        <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                          <input
                            type="checkbox"
                            checked={selectedLists.includes(list.ListId)}
                            onChange={() => toggleList(list.ListId)}
                            style={{ marginRight: '10px', width: 'auto' }}
                          />
                          📋 {list.Name} ({list.ContactCount || 0} contacts)
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Individual Contacts Selection */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                  <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Individual Contacts</label>
                  <button type="button" onClick={selectAll} className="btn btn-secondary" style={{ padding: '5px 15px', fontSize: '12px' }}>
                    Select All Contacts
                  </button>
                </div>
                {/* Contact Search */}
                <div style={{ marginBottom: '10px' }}>
                  <input
                    type="text"
                    placeholder="Search contacts by name or email..."
                    value={contactSearchQuery}
                    onChange={(e) => setContactSearchQuery(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px',
                      fontSize: '13px',
                      border: '1px solid #ddd',
                      borderRadius: '4px'
                    }}
                  />
                </div>
                <div style={{ maxHeight: '200px', overflow: 'auto', border: '1px solid #ddd', borderRadius: '4px', padding: '10px' }}>
                  {contacts
                    .filter(contact => {
                      if (!contactSearchQuery.trim()) return true;
                      const query = contactSearchQuery.toLowerCase();
                      return (
                        (contact.FirstName && contact.FirstName.toLowerCase().includes(query)) ||
                        (contact.LastName && contact.LastName.toLowerCase().includes(query)) ||
                        (contact.Email && contact.Email.toLowerCase().includes(query)) ||
                        (contact.Company && contact.Company.toLowerCase().includes(query)) ||
                        (contact.JobTitle && contact.JobTitle.toLowerCase().includes(query))
                      );
                    })
                    .map(contact => (
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
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <Link 
                        to={`/campaigns/${campaign.CampaignId}`} 
                        title="View campaign details"
                        style={{ 
                          background: 'none', 
                          border: 'none', 
                          cursor: 'pointer', 
                          fontSize: '18px',
                          padding: '4px',
                          textDecoration: 'none'
                        }}
                      >
                        👁️
                      </Link>
                      {campaign.Status === 'draft' && (
                        <button 
                          onClick={() => setConfirmAction({ show: true, type: 'send', id: campaign.CampaignId })} 
                          title="Send campaign"
                          style={{ 
                            background: 'none', 
                            border: 'none', 
                            cursor: 'pointer', 
                            fontSize: '18px',
                            padding: '4px'
                          }}
                        >
                          📤
                        </button>
                      )}
                      {campaign.Status === 'sending' && (
                        <button 
                          onClick={() => setConfirmAction({ show: true, type: 'stop', id: campaign.CampaignId })} 
                          title="Stop campaign"
                          style={{ 
                            background: 'none', 
                            border: 'none', 
                            cursor: 'pointer', 
                            fontSize: '18px',
                            padding: '4px'
                          }}
                        >
                          ⏸️
                        </button>
                      )}
                      <button 
                        onClick={() => setConfirmAction({ show: true, type: 'delete', id: campaign.CampaignId })} 
                        title="Delete campaign"
                        style={{ 
                          background: 'none', 
                          border: 'none', 
                          cursor: 'pointer', 
                          fontSize: '18px',
                          padding: '4px'
                        }}
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ConfirmModal
        show={confirmAction.show}
        title={
          confirmAction.type === 'send' ? 'Send Campaign' :
          confirmAction.type === 'stop' ? 'Stop Campaign' :
          confirmAction.type === 'delete' ? 'Delete Campaign' : ''
        }
        message={
          confirmAction.type === 'send' ? 'Are you sure you want to send this campaign?' :
          confirmAction.type === 'stop' ? 'Are you sure you want to stop this campaign?' :
          confirmAction.type === 'delete' ? 'Are you sure you want to delete this campaign? This action cannot be undone.' : ''
        }
        onConfirm={
          confirmAction.type === 'send' ? handleSend :
          confirmAction.type === 'stop' ? handleStop :
          confirmAction.type === 'delete' ? handleDelete : null
        }
        onCancel={() => setConfirmAction({ show: false, type: null, id: null })}
        confirmText={confirmAction.type === 'delete' ? 'Delete' : 'Confirm'}
        confirmStyle={confirmAction.type === 'delete' ? 'danger' : 'primary'}
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

export default Campaigns;

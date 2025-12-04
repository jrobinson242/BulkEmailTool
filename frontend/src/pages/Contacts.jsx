import React, { useEffect, useState } from 'react';
import { contactsAPI } from '../services/api.jsx';

const Contacts = () => {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [showFolderSelect, setShowFolderSelect] = useState(false);
  const [folders, setFolders] = useState([]);
  const [selectedFolders, setSelectedFolders] = useState([]);
  const [expandedFolders, setExpandedFolders] = useState([]);
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [selectedSyncContacts, setSelectedSyncContacts] = useState([]); // For sync dialog contacts
  const [loadingFolders, setLoadingFolders] = useState(false);
  const [folderSearch, setFolderSearch] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    company: '',
    jobTitle: '',
    phone: '',
    tags: ''
  });

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    try {
      setLoading(true);
      const response = await contactsAPI.getAll();
      setContacts(response.data);
    } catch (err) {
      setError('Failed to load contacts');
    } finally {
      setLoading(false);
    }
  };

  const loadFolders = async () => {
    try {
      setLoadingFolders(true);
      const response = await contactsAPI.getFolders();
      setFolders(response.data);
      setShowFolderSelect(true);
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message;
      if (errorMsg.includes('token is expired') || errorMsg.includes('Lifetime validation failed')) {
        alert('Your session has expired. Please log out and log back in to refresh your credentials.');
      } else {
        alert('Failed to load contact folders: ' + errorMsg);
      }
    } finally {
      setLoadingFolders(false);
    }
  };

  const toggleFolder = (folderId) => {
    setSelectedFolders(prev => 
      prev.includes(folderId)
        ? prev.filter(id => id !== folderId)
        : [...prev, folderId]
    );
  };

  const toggleFolderExpansion = (folderId) => {
    setExpandedFolders(prev => 
      prev.includes(folderId)
        ? prev.filter(id => id !== folderId)
        : [...prev, folderId]
    );
  };

  const selectAllFolders = () => {
    setSelectedFolders(folders.map(f => f.id));
  };

  const toggleContact = (contactId) => {
    setSelectedContacts(prev => 
      prev.includes(contactId)
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  };

  const toggleSyncContact = (folderId, contact) => {
    const contactKey = `${folderId}:${contact.email}`;
    setSelectedSyncContacts(prev => {
      const exists = prev.find(c => `${c.folderId}:${c.email}` === contactKey);
      if (exists) {
        return prev.filter(c => `${c.folderId}:${c.email}` !== contactKey);
      } else {
        return [...prev, { folderId, ...contact }];
      }
    });
  };

  const toggleAllContacts = () => {
    if (selectedContacts.length === contacts.length) {
      setSelectedContacts([]);
    } else {
      setSelectedContacts(contacts.map(c => c.ContactId));
    }
  };

  const handleCSVUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      await contactsAPI.import(file);
      alert('Contacts imported successfully!');
      await loadContacts();
    } catch (err) {
      alert('Failed to import contacts: ' + (err.response?.data?.error || err.message));
    }
  };

  // Filter folders and contacts based on search
  const filteredFolders = folders.map(folder => {
    if (!folderSearch) return folder; // Show all if no search
    
    const searchLower = folderSearch.toLowerCase();
    const matchesFolder = folder.displayName?.toLowerCase().includes(searchLower);
    
    // Filter contacts that match the search
    const matchingContacts = folder.contacts?.filter(contact => 
      contact.displayName?.toLowerCase().includes(searchLower) ||
      contact.givenName?.toLowerCase().includes(searchLower) ||
      contact.surname?.toLowerCase().includes(searchLower) ||
      contact.email?.toLowerCase().includes(searchLower)
    ) || [];
    
    // Show folder if it matches OR if any contacts match
    if (matchesFolder || matchingContacts.length > 0) {
      return {
        ...folder,
        // If folder name matches, show all contacts; otherwise show only matching contacts
        contacts: matchesFolder ? folder.contacts : matchingContacts,
        filteredContactCount: matchesFolder ? folder.contacts?.length : matchingContacts.length
      };
    }
    
    return null;
  }).filter(folder => folder !== null);

  const handleSync = async () => {
    try {
      setSyncing(true);
      
      // If individual contacts are selected, sync only those
      if (selectedSyncContacts.length > 0) {
        const response = await contactsAPI.sync({ contacts: selectedSyncContacts });
        await loadContacts();
        setShowFolderSelect(false);
        setSelectedFolders([]);
        setSelectedSyncContacts([]);
        alert(`${response.data.message}\nSynced: ${response.data.count}\nSkipped: ${response.data.skipped || 0}`);
      } else {
        // Otherwise sync entire selected folders
        const folderIds = selectedFolders.length > 0 ? selectedFolders : undefined;
        const response = await contactsAPI.sync({ folderIds });
        await loadContacts();
        setShowFolderSelect(false);
        setSelectedFolders([]);
        alert(`${response.data.message}\nSynced: ${response.data.count}\nSkipped: ${response.data.skipped || 0}`);
      }
    } catch (err) {
      console.error('Sync error:', err);
      const errorMsg = err.response?.data?.error || err.message || 'Unknown error';
      alert(`Failed to sync contacts: ${errorMsg}`);
    } finally {
      setSyncing(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingContact) {
        // Update existing contact
        await contactsAPI.update(editingContact.ContactId, formData);
      } else {
        // Create new contact
        await contactsAPI.create(formData);
      }
      setShowForm(false);
      setEditingContact(null);
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        company: '',
        jobTitle: '',
        phone: '',
        tags: ''
      });
      await loadContacts();
    } catch (err) {
      alert(`Failed to ${editingContact ? 'update' : 'create'} contact`);
    }
  };

  const handleEdit = (contact) => {
    setEditingContact(contact);
    setFormData({
      firstName: contact.FirstName || '',
      lastName: contact.LastName || '',
      email: contact.Email || '',
      company: contact.Company || '',
      jobTitle: contact.JobTitle || '',
      phone: contact.Phone || '',
      tags: contact.Tags || ''
    });
    setShowForm(true);
  };

  const handleCancelEdit = () => {
    setShowForm(false);
    setEditingContact(null);
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      company: '',
      jobTitle: '',
      phone: '',
      tags: ''
    });
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this contact?')) {
      try {
        setDeleting(true);
        await contactsAPI.delete(id);
        await loadContacts();
      } catch (err) {
        console.error('Delete error:', err);
        alert('Failed to delete contact: ' + (err.response?.data?.error || err.message));
      } finally {
        setDeleting(false);
      }
    }
  };

  const handleBulkDelete = async () => {
    if (selectedContacts.length === 0) {
      alert('Please select contacts to delete');
      return;
    }

    if (window.confirm(`Are you sure you want to delete ${selectedContacts.length} selected contact${selectedContacts.length !== 1 ? 's' : ''}? This cannot be undone!`)) {
      try {
        setDeleting(true);
        // Delete each selected contact
        let deleted = 0;
        let failed = 0;
        
        for (const contactId of selectedContacts) {
          try {
            await contactsAPI.delete(contactId);
            deleted++;
          } catch (err) {
            failed++;
            console.error(`Failed to delete contact ${contactId}:`, err);
          }
        }
        
        alert(`Successfully deleted ${deleted} contact${deleted !== 1 ? 's' : ''}${failed > 0 ? `, ${failed} failed` : ''}`);
        setSelectedContacts([]);
        await loadContacts();
      } catch (err) {
        console.error('Bulk delete error:', err);
        alert('Failed to delete contacts: ' + (err.response?.data?.error || err.message));
      } finally {
        setDeleting(false);
      }
    }
  };

  if (loading) return <div className="loading">Loading contacts...</div>;

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>Contacts</h1>
        <div>
          <button onClick={loadFolders} disabled={syncing || loadingFolders} className="btn btn-secondary" style={{ marginRight: '10px' }}>
            {loadingFolders ? 'Loading...' : 'Select Sources to Sync'}
          </button>
          {selectedContacts.length > 0 && (
            <button onClick={handleBulkDelete} disabled={deleting} className="btn btn-danger" style={{ marginRight: '10px' }}>
              {deleting ? '🔄 Deleting...' : `Delete Selected (${selectedContacts.length})`}
            </button>
          )}
          <label className="btn btn-secondary" style={{ marginRight: '10px', cursor: 'pointer', display: 'inline-block' }}>
            Upload CSV
            <input
              type="file"
              accept=".csv"
              onChange={handleCSVUpload}
              style={{ display: 'none' }}
            />
          </label>
          <button onClick={() => setShowForm(!showForm)} className="btn btn-primary">
            {showForm ? 'Cancel' : 'Add Contact'}
          </button>
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      {showFolderSelect && (
        <div className="card" style={{ marginBottom: '20px' }}>
          <h2>Select Contact Sources to Sync</h2>
          <div style={{ marginBottom: '15px' }}>
            <button 
              onClick={selectAllFolders} 
              className="btn btn-secondary" 
              style={{ marginRight: '10px', padding: '5px 15px' }}
            >
              Select All
            </button>
            <button 
              onClick={() => setSelectedFolders([])} 
              className="btn btn-secondary" 
              style={{ marginRight: '10px', padding: '5px 15px' }}
            >
              Clear Selection
            </button>
            <span style={{ color: '#666' }}>
              {selectedFolders.length} of {folders.length} selected
            </span>
          </div>
          <input
            type="text"
            placeholder="Search folders or contacts by name, email..."
            value={folderSearch}
            onChange={(e) => setFolderSearch(e.target.value)}
            style={{ marginBottom: '15px', width: '100%' }}
          />
          <div style={{ maxHeight: '300px', overflow: 'auto', border: '1px solid #ddd', borderRadius: '4px', padding: '10px', marginBottom: '15px' }}>
            {filteredFolders.length === 0 ? (
              <div style={{ padding: '10px', color: '#666', textAlign: 'center' }}>No folders or contacts match your search</div>
            ) : (
              filteredFolders.map(folder => {
                const isExpanded = expandedFolders.includes(folder.id) || (folderSearch && folder.contacts?.length > 0);
                const displayCount = folder.filteredContactCount !== undefined ? folder.filteredContactCount : folder.contactCount;
                return (
              <div key={folder.id} style={{ marginBottom: '10px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', flex: 1 }}>
                    <input
                      type="checkbox"
                      checked={selectedFolders.includes(folder.id)}
                      onChange={() => toggleFolder(folder.id)}
                      style={{ marginRight: '10px', width: 'auto' }}
                    />
                    <strong>{folder.displayName}</strong>
                    <span style={{ color: '#666', fontSize: '14px', marginLeft: '10px' }}>
                      ({displayCount} {folderSearch && folder.filteredContactCount !== folder.contactCount ? 'matching' : ''} contact{displayCount !== 1 ? 's' : ''})
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={() => toggleFolderExpansion(folder.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '18px',
                      padding: '0 10px',
                      color: '#666'
                    }}
                  >
                    {isExpanded ? '▼' : '▶'}
                  </button>
                </div>
                {isExpanded && folder.contacts && folder.contacts.length > 0 && (
                  <div style={{ marginLeft: '30px', marginTop: '8px', fontSize: '13px', color: '#555' }}>
                    {folder.contacts.map((contact, idx) => {
                      const contactKey = `${folder.id}:${contact.email}`;
                      const isSelected = selectedSyncContacts.some(c => `${c.folderId}:${c.email}` === contactKey);
                      return (
                        <div key={idx} style={{ padding: '4px 0', display: 'flex', alignItems: 'center' }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSyncContact(folder.id, contact)}
                            style={{ marginRight: '8px', width: 'auto', cursor: 'pointer' }}
                          />
                          <label 
                            style={{ cursor: 'pointer', margin: 0 }}
                            onClick={() => toggleSyncContact(folder.id, contact)}
                          >
                            {contact.displayName || `${contact.givenName} ${contact.surname}`}
                            {contact.email && <span style={{ color: '#888' }}> ({contact.email})</span>}
                          </label>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              );
            })
            )}
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button 
              onClick={handleSync} 
              disabled={syncing || (selectedFolders.length === 0 && selectedSyncContacts.length === 0)} 
              className="btn btn-primary"
            >
              {syncing ? 'Syncing...' : 
                selectedSyncContacts.length > 0 
                  ? `Sync ${selectedSyncContacts.length} Contact${selectedSyncContacts.length !== 1 ? 's' : ''}`
                  : `Sync ${selectedFolders.length} Source${selectedFolders.length !== 1 ? 's' : ''}`
              }
            </button>
            <button 
              onClick={() => {
                setShowFolderSelect(false);
                setSelectedSyncContacts([]);
              }} 
              className="btn btn-secondary"
            >
              Cancel
            </button>
            {selectedSyncContacts.length > 0 && (
              <span style={{ color: '#666', fontSize: '14px' }}>
                {selectedSyncContacts.length} individual contact{selectedSyncContacts.length !== 1 ? 's' : ''} selected
              </span>
            )}
          </div>
        </div>
      )}

      {showForm && (
        <div className="card">
          <h2>{editingContact ? 'Edit Contact' : 'New Contact'}</h2>
          <form onSubmit={handleSubmit}>
            <input
              type="text"
              placeholder="First Name"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            />
            <input
              type="text"
              placeholder="Last Name"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            />
            <input
              type="email"
              placeholder="Email *"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
            <input
              type="text"
              placeholder="Company"
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
            />
            <input
              type="text"
              placeholder="Job Title"
              value={formData.jobTitle}
              onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
            />
            <input
              type="tel"
              placeholder="Phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
            <input
              type="text"
              placeholder="Tags (comma separated)"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
            />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="submit" className="btn btn-primary">
                {editingContact ? 'Update Contact' : 'Create Contact'}
              </button>
              <button type="button" onClick={handleCancelEdit} className="btn btn-secondary">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <h2>Contact List ({contacts.length})</h2>
        {contacts.length === 0 ? (
          <p>No contacts found. Sync from Outlook or add manually.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th style={{ width: '40px' }}>
                  <input
                    type="checkbox"
                    checked={selectedContacts.length === contacts.length && contacts.length > 0}
                    onChange={toggleAllContacts}
                    style={{ cursor: 'pointer' }}
                  />
                </th>
                <th>Name</th>
                <th>Email</th>
                <th>Company</th>
                <th>Job Title</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((contact) => (
                <tr key={contact.ContactId}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedContacts.includes(contact.ContactId)}
                      onChange={() => toggleContact(contact.ContactId)}
                      style={{ cursor: 'pointer' }}
                    />
                  </td>
                  <td>{contact.FirstName} {contact.LastName}</td>
                  <td>{contact.Email}</td>
                  <td>{contact.Company}</td>
                  <td>{contact.JobTitle}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <button 
                        onClick={() => handleEdit(contact)} 
                        disabled={deleting}
                        className="btn btn-secondary"
                        style={{ padding: '5px 10px', fontSize: '12px' }}
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => handleDelete(contact.ContactId)} 
                        disabled={deleting}
                        className="btn btn-danger"
                        style={{ padding: '5px 10px', fontSize: '12px' }}
                      >
                        {deleting ? '🔄' : 'Delete'}
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

export default Contacts;

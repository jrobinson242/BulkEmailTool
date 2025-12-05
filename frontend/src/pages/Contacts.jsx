import React, { useEffect, useState } from 'react';
import { contactsAPI, contactListsAPI } from '../services/api.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';
import SuccessModal from '../components/SuccessModal.jsx';

const Contacts = () => {
  const [contacts, setContacts] = useState([]);
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [contactListMap, setContactListMap] = useState({}); // Map of ContactId -> array of list names
  const [lists, setLists] = useState([]);
  const [selectedList, setSelectedList] = useState(null);
  const [showListForm, setShowListForm] = useState(false);
  const [listFormData, setListFormData] = useState({ name: '', description: '', isGlobal: false });
  const [editingListId, setEditingListId] = useState(null);
  const [showAddToListDialog, setShowAddToListDialog] = useState(false);
  const [contactToAssign, setContactToAssign] = useState(null);
  const [selectedListIds, setSelectedListIds] = useState([]);
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
  const [showCSVDialog, setShowCSVDialog] = useState(false);
  const [importTargetList, setImportTargetList] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewContacts, setPreviewContacts] = useState([]);
  const [selectedPreviewContacts, setSelectedPreviewContacts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmDelete, setConfirmDelete] = useState({ show: false, type: null, id: null, name: null, count: null });
  const [successMessage, setSuccessMessage] = useState({ show: false, title: '', message: '' });
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
    loadLists();
  }, []);

  useEffect(() => {
    // Filter contacts based on selected list
    if (selectedList === null) {
      applySearchFilter(contacts);
    } else {
      loadListMembers(selectedList);
    }
  }, [selectedList, contacts, searchQuery]);

  const applySearchFilter = (contactsToFilter) => {
    if (!searchQuery.trim()) {
      setFilteredContacts(contactsToFilter);
      return;
    }
    
    const query = searchQuery.toLowerCase();
    const filtered = contactsToFilter.filter(contact => {
      return (
        (contact.FirstName && contact.FirstName.toLowerCase().includes(query)) ||
        (contact.LastName && contact.LastName.toLowerCase().includes(query)) ||
        (contact.Email && contact.Email.toLowerCase().includes(query)) ||
        (contact.Company && contact.Company.toLowerCase().includes(query)) ||
        (contact.JobTitle && contact.JobTitle.toLowerCase().includes(query))
      );
    });
    setFilteredContacts(filtered);
  };

  const loadContacts = async () => {
    try {
      setLoading(true);
      const response = await contactsAPI.getAll();
      setContacts(response.data);
      setFilteredContacts(response.data);
    } catch (err) {
      setError('Failed to load contacts');
    } finally {
      setLoading(false);
    }
  };

  const loadListMembers = async (listId) => {
    try {
      const response = await contactListsAPI.getOne(listId);
      const listContacts = response.data.contacts || [];
      // Filter the contacts array to only show contacts in this list
      const listContactIds = listContacts.map(c => c.ContactId);
      const membersInList = contacts.filter(c => listContactIds.includes(c.ContactId));
      applySearchFilter(membersInList);
    } catch (err) {
      console.error('Failed to load list members', err);
      setFilteredContacts([]);
    }
  };

  const loadLists = async () => {
    try {
      const response = await contactListsAPI.getAll();
      setLists(response.data);
      await buildContactListMap(response.data);
    } catch (err) {
      console.error('Failed to load lists', err);
    }
  };

  const buildContactListMap = async (allLists) => {
    try {
      const map = {};
      
      // Fetch members for each list
      for (const list of allLists) {
        const response = await contactListsAPI.getOne(list.ListId);
        const members = response.data.contacts || [];
        
        members.forEach(contact => {
          if (!map[contact.ContactId]) {
            map[contact.ContactId] = [];
          }
          map[contact.ContactId].push(list.Name);
        });
      }
      
      setContactListMap(map);
    } catch (err) {
      console.error('Failed to build contact list map', err);
    }
  };

  const handleCreateList = async (e) => {
    e.preventDefault();
    try {
      if (editingListId) {
        await contactListsAPI.update(editingListId, listFormData);
        setSuccessMessage({ show: true, title: 'Success', message: 'List updated successfully' });
      } else {
        await contactListsAPI.create(listFormData);
        setSuccessMessage({ show: true, title: 'Success', message: 'List created successfully' });
      }
      setShowListForm(false);
      setListFormData({ name: '', description: '', isGlobal: false });
      setEditingListId(null);
      await loadLists();
    } catch (err) {
      alert('Failed to save list: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleEditList = (list) => {
    setListFormData({ name: list.Name, description: list.Description || '', isGlobal: list.IsGlobal || false });
    setEditingListId(list.ListId);
    setShowListForm(true);
  };

  const handleDeleteList = async () => {
    try {
      await contactListsAPI.delete(confirmDelete.id);
      setConfirmDelete({ show: false, type: null, id: null, name: null, count: null });
      setSuccessMessage({ show: true, title: 'Success', message: 'List deleted successfully' });
      await loadLists();
      if (selectedList === confirmDelete.id) {
        setSelectedList(null);
      }
    } catch (err) {
      alert('Failed to delete list');
      setConfirmDelete({ show: false, type: null, id: null, name: null, count: null });
    }
  };

  const handleAddToList = async () => {
    const contactIds = contactToAssign ? [contactToAssign] : selectedContacts;
    
    if (contactIds.length === 0) {
      alert('Please select contacts');
      return;
    }
    
    try {
      // Determine which lists to add to and which to remove from
      const currentListIds = new Set();
      for (const contactId of contactIds) {
        const assignedLists = contactListMap[contactId] || [];
        const contactCurrentListIds = lists
          .filter(list => assignedLists.includes(list.Name))
          .map(list => list.ListId);
        contactCurrentListIds.forEach(id => currentListIds.add(id));
      }
      
      const selectedSet = new Set(selectedListIds);
      const listsToAdd = selectedListIds.filter(id => !currentListIds.has(id));
      const listsToRemove = Array.from(currentListIds).filter(id => !selectedSet.has(id));
      
      const operations = [];
      
      // Add contacts to newly selected lists
      listsToAdd.forEach(listId => {
        operations.push(contactListsAPI.addContacts(listId, contactIds));
      });
      
      // Remove contacts from deselected lists
      listsToRemove.forEach(listId => {
        contactIds.forEach(contactId => {
          operations.push(contactListsAPI.removeContact(listId, contactId));
        });
      });
      
      if (operations.length > 0) {
        await Promise.all(operations);
      }
      
      setSuccessMessage({ 
        show: true, 
        title: 'Success', 
        message: `${contactIds.length} contact(s) updated successfully` 
      });
      setShowAddToListDialog(false);
      setContactToAssign(null);
      setSelectedContacts([]);
      setSelectedListIds([]);
      await loadLists();
      if (selectedList) {
        await loadListMembers(selectedList);
      }
    } catch (err) {
      alert('Failed to update contacts: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleRemoveFromList = async (contactId) => {
    if (!selectedList) return;
    try {
      await contactListsAPI.removeContact(selectedList, contactId);
      setSuccessMessage({ show: true, title: 'Success', message: 'Contact removed from list' });
      await loadListMembers(selectedList);
      await loadLists(); // Refresh counts
    } catch (err) {
      alert('Failed to remove contact from list: ' + (err.response?.data?.error || err.message));
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
    if (selectedContacts.length === filteredContacts.length) {
      setSelectedContacts([]);
    } else {
      setSelectedContacts(filteredContacts.map(c => c.ContactId));
    }
  };

  const handleCSVUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const response = await contactsAPI.importPreview(file);
      const { newContacts, existingCount, totalParsed } = response.data;
      
      if (newContacts.length === 0) {
        alert(`All ${totalParsed} contacts in the CSV already exist in your database.`);
        setShowCSVDialog(false);
        e.target.value = '';
        return;
      }
      
      // Show preview modal with new contacts
      setPreviewContacts(newContacts);
      setSelectedPreviewContacts(newContacts.map((_, index) => index)); // Select all by default
      setShowCSVDialog(false);
      setShowPreviewModal(true);
      
      if (existingCount > 0) {
        console.log(`${existingCount} contacts already exist and will be skipped`);
      }
    } catch (err) {
      alert('Failed to parse CSV: ' + (err.response?.data?.error || err.message));
    }
    // Reset the file input
    e.target.value = '';
  };

  const handleConfirmImport = async () => {
    try {
      // Get only selected contacts
      const contactsToImport = selectedPreviewContacts.map(index => previewContacts[index]);
      
      if (contactsToImport.length === 0) {
        alert('Please select at least one contact to import');
        return;
      }
      
      const response = await contactsAPI.importConfirm(contactsToImport);
      const importedContactIds = response.data?.contactIds || [];
      
      // If a target list is selected and we have imported contact IDs, add them to the list
      if (importTargetList && importedContactIds.length > 0) {
        try {
          await contactListsAPI.addContacts(importTargetList, importedContactIds);
          setSuccessMessage({ 
            show: true, 
            title: 'Success', 
            message: `${importedContactIds.length} contact(s) imported and added to list!` 
          });
        } catch (listErr) {
          console.error('Failed to add to list:', listErr);
          setSuccessMessage({ 
            show: true, 
            title: 'Partially Successful', 
            message: `${importedContactIds.length} contact(s) imported but failed to add to list.` 
          });
        }
      } else {
        setSuccessMessage({ 
          show: true, 
          title: 'Success', 
          message: `${importedContactIds.length} contact(s) imported successfully!` 
        });
      }
      
      await loadContacts();
      if (importTargetList) {
        await loadLists();
      }
      
      // Reset states
      setShowPreviewModal(false);
      setPreviewContacts([]);
      setSelectedPreviewContacts([]);
      setImportTargetList(null);
    } catch (err) {
      alert('Failed to import contacts: ' + (err.response?.data?.error || err.message));
    }
  };

  const togglePreviewContact = (index) => {
    setSelectedPreviewContacts(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const toggleAllPreviewContacts = () => {
    if (selectedPreviewContacts.length === previewContacts.length) {
      setSelectedPreviewContacts([]);
    } else {
      setSelectedPreviewContacts(previewContacts.map((_, index) => index));
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

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await contactsAPI.delete(confirmDelete.id);
      await loadContacts();
      setConfirmDelete({ show: false, type: null, id: null, name: null, count: null });
    } catch (err) {
      console.error('Delete error:', err);
      alert('Failed to delete contact: ' + (err.response?.data?.error || err.message));
      setConfirmDelete({ show: false, type: null, id: null, name: null, count: null });
    } finally {
      setDeleting(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedContacts.length === 0) {
      alert('Please select contacts to delete');
      return;
    }
    try {
      setDeleting(true);
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
      
      setConfirmDelete({ show: false, type: null, id: null, name: null, count: null });
      setSuccessMessage({ 
        show: true, 
        title: 'Success', 
        message: `Successfully deleted ${deleted} contact${deleted !== 1 ? 's' : ''}${failed > 0 ? `, ${failed} failed` : ''}` 
      });
      setSelectedContacts([]);
      await loadContacts();
    } catch (err) {
      console.error('Bulk delete error:', err);
      alert('Failed to delete contacts: ' + (err.response?.data?.error || err.message));
      setConfirmDelete({ show: false, type: null, id: null, name: null, count: null });
    } finally {
      setDeleting(false);
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
            <>
              <button onClick={() => setConfirmDelete({ show: true, type: 'bulk', id: null, name: null, count: selectedContacts.length })} disabled={deleting} className="btn btn-danger" style={{ marginRight: '10px' }}>
                {deleting ? '🔄 Deleting...' : `Delete Selected (${selectedContacts.length})`}
              </button>
              <button onClick={() => {
                // Initialize with lists that all selected contacts are already in
                const initialLists = lists.filter(list => 
                  selectedContacts.every(cId => {
                    const assignedLists = contactListMap[cId] || [];
                    return assignedLists.includes(list.Name);
                  })
                ).map(list => list.ListId);
                setSelectedListIds(initialLists);
                setShowAddToListDialog(true);
              }} className="btn btn-secondary" style={{ marginRight: '10px' }}>
                Add to List
              </button>
            </>
          )}
          <button onClick={() => setShowCSVDialog(true)} className="btn btn-secondary" style={{ marginRight: '10px' }}>
            Upload CSV
          </button>
          <button onClick={() => setShowForm(!showForm)} className="btn btn-primary">
            {showForm ? 'Cancel' : 'Add Contact'}
          </button>
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      {/* Search Bar */}
      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="Search contacts by name, email, company, or job title..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: '100%',
            padding: '10px',
            fontSize: '14px',
            border: '1px solid #ddd',
            borderRadius: '4px'
          }}
        />
      </div>

      {/* Contact Lists Tabs */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', borderBottom: '2px solid #ddd', paddingBottom: '5px' }}>
          {/* All Contacts Tab */}
          <div
            onClick={() => setSelectedList(null)}
            style={{
              padding: '10px 20px',
              cursor: 'pointer',
              backgroundColor: selectedList === null ? '#007bff' : '#f8f9fa',
              color: selectedList === null ? 'white' : '#333',
              border: '1px solid #ddd',
              borderBottom: selectedList === null ? 'none' : '1px solid #ddd',
              borderRadius: '8px 8px 0 0',
              fontWeight: selectedList === null ? 'bold' : 'normal',
              transition: 'all 0.2s',
              marginBottom: '-2px',
              borderBottomColor: selectedList === null ? 'transparent' : '#ddd'
            }}
          >
            All Contacts ({contacts.length})
          </div>
          
          {/* List Tabs */}
          {lists.map(list => (
            <div
              key={list.ListId}
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                padding: '10px 15px',
                cursor: 'pointer',
                backgroundColor: selectedList === list.ListId ? '#007bff' : '#f8f9fa',
                color: selectedList === list.ListId ? 'white' : '#333',
                border: '1px solid #ddd',
                borderBottom: selectedList === list.ListId ? 'none' : '1px solid #ddd',
                borderRadius: '8px 8px 0 0',
                fontWeight: selectedList === list.ListId ? 'bold' : 'normal',
                transition: 'all 0.2s',
                marginBottom: '-2px',
                borderBottomColor: selectedList === list.ListId ? 'transparent' : '#ddd'
              }}
            >
              <span onClick={() => setSelectedList(list.ListId)} style={{ marginRight: '10px' }}>
                📋 {list.Name} ({list.ContactCount || 0})
                {list.IsGlobal && <span style={{ marginLeft: '5px', fontSize: '12px', opacity: 0.8 }} title="Global">🌐</span>}
              </span>
              <div style={{ display: 'flex', gap: '5px' }}>
                <button
                  onClick={(e) => { e.stopPropagation(); setEditingListId(list.ListId); setListFormData({ name: list.Name, description: list.Description || '', isGlobal: list.IsGlobal || false }); setShowListForm(true); }}
                  style={{ 
                    background: 'none', 
                    border: 'none', 
                    cursor: 'pointer', 
                    fontSize: '14px', 
                    padding: '2px 5px',
                    color: selectedList === list.ListId ? 'white' : '#666'
                  }}
                  title="Edit list"
                >
                  ✏️
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setConfirmDelete({ show: true, type: 'list', id: list.ListId, name: list.Name, count: null }); }}
                  style={{ 
                    background: 'none', 
                    border: 'none', 
                    cursor: 'pointer', 
                    fontSize: '14px', 
                    padding: '2px 5px',
                    color: selectedList === list.ListId ? 'white' : '#666'
                  }}
                  title="Delete list"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}

          {/* New List Tab (always on the right) */}
          <div
            onClick={() => { setEditingListId(null); setListFormData({ name: '', description: '', isGlobal: false }); setShowListForm(true); }}
            style={{
              padding: '10px 20px',
              cursor: 'pointer',
              backgroundColor: '#28a745',
              color: 'white',
              border: '1px solid #28a745',
              borderRadius: '8px 8px 0 0',
              fontWeight: 'bold',
              transition: 'all 0.2s',
              marginBottom: '-2px'
            }}
            title="Create new list"
          >
            ➕ New List
          </div>
        </div>
      </div>

      {/* List Form Modal */}
      {showListForm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '8px',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)'
          }}>
            <h2>{editingListId ? 'Edit List' : 'Create New List'}</h2>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>List Name *</label>
              <input
                type="text"
                value={listFormData.name || ''}
                onChange={(e) => setListFormData({ ...listFormData, name: e.target.value })}
                placeholder="Enter list name"
                style={{ width: '100%' }}
              />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>Description</label>
              <textarea
                value={listFormData.description || ''}
                onChange={(e) => setListFormData({ ...listFormData, description: e.target.value })}
                placeholder="Optional description"
                rows="3"
                style={{ width: '100%' }}
              />
            </div>
            <div style={{display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
              <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                <input
                  type="checkbox"
                  checked={listFormData.isGlobal || false}
                  onChange={(e) => setListFormData({ ...listFormData, isGlobal: e.target.checked })}
                  style={{ margin: 0 }}
                />
                <span style={{ fontSize: '14px', marginLeft: '8px', whiteSpace: 'nowrap' }}>
                  <strong>Global List</strong> - Visible to all users
                </span>
              </label>
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button onClick={() => { setShowListForm(false); setEditingListId(null); setListFormData({ name: '', description: '', isGlobal: false }); }} className="btn btn-secondary">
                Cancel
              </button>
              <button onClick={handleCreateList} className="btn btn-primary" disabled={!listFormData.name || !listFormData.name.trim()}>
                {editingListId ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add to List Modal */}
      {showAddToListDialog && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '8px',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)'
          }}>
            <h2 style={{ textAlign: 'left' }}>
              {contactToAssign 
                ? 'Manage Contact Lists' 
                : `Manage Lists for ${selectedContacts.length} Contact${selectedContacts.length !== 1 ? 's' : ''}`}
            </h2>
            <p style={{ fontSize: '14px', color: '#666', marginBottom: '15px', textAlign: 'left' }}>
              Check the lists you want this contact to be in. Uncheck to remove.
            </p>
            <div style={{ marginBottom: '20px', maxHeight: '300px', overflowY: 'auto', border: '1px solid #ddd', borderRadius: '4px', padding: '10px' }}>
              {lists.length === 0 ? (
                <p style={{ color: '#999', fontStyle: 'italic', textAlign: 'center', padding: '20px' }}>
                  No lists available. Create a list first.
                </p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    {lists.map((list) => {
                      const isChecked = selectedListIds.includes(list.ListId);

                      return (
                        <tr
                          key={list.ListId}
                          onClick={() => {
                            if (isChecked) {
                              setSelectedListIds(selectedListIds.filter((id) => id !== list.ListId));
                            } else {
                              setSelectedListIds([...selectedListIds, list.ListId]);
                            }
                          }}
                          style={{
                            cursor: 'pointer',
                            backgroundColor: isChecked ? '#e3f2fd' : 'transparent',
                            borderRadius: '4px'
                          }}
                        >
                          <td style={{ width: '30px', padding: '8px 4px' }}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedListIds([...selectedListIds, list.ListId]);
                                } else {
                                  setSelectedListIds(selectedListIds.filter((id) => id !== list.ListId));
                                }
                              }}
                              onClick={(e) => e.stopPropagation()}
                              style={{ cursor: 'pointer' }}
                            />
                          </td>
                          <td style={{ padding: '8px 4px', textAlign: 'left' }}>
                            {list.Name}
                            {list.IsGlobal && <span style={{ marginLeft: '5px', fontSize: '12px' }} title="Global">🌐</span>}
                          </td>
                          <td style={{ padding: '8px 4px', textAlign: 'right', fontSize: '12px', color: '#666', width: '60px' }}>
                            ({list.ContactCount || 0})
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => { setShowAddToListDialog(false); setContactToAssign(null); setSelectedListIds([]); }} className="btn btn-secondary">
                Cancel
              </button>
              <button onClick={handleAddToList} className="btn btn-primary">
                Update Lists
              </button>
            </div>
          </div>
        </div>
      )}

      {showCSVDialog && (
        <div className="card" style={{ marginBottom: '20px', backgroundColor: '#f9f9f9' }}>
          <h2>Upload CSV File</h2>
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '16px', marginBottom: '10px' }}>CSV File Format</h3>
            <p style={{ marginBottom: '10px', color: '#555' }}>
              Your CSV file should contain a header row with the following column names (case-insensitive):
            </p>
            <ul style={{ marginLeft: '20px', marginBottom: '15px', color: '#555' }}>
              <li><strong>Email</strong> (required)</li>
              <li><strong>FirstName</strong> (optional)</li>
              <li><strong>LastName</strong> (optional)</li>
              <li><strong>Company</strong> (optional)</li>
              <li><strong>JobTitle</strong> (optional)</li>
              <li><strong>Phone</strong> (optional)</li>
              <li><strong>Tags</strong> (optional) - Comma-separated values to use for categorization or filtering</li>
            </ul>
            <div style={{ backgroundColor: '#fff', padding: '10px', borderRadius: '4px', border: '1px solid #ddd', marginBottom: '15px' }}>
              <strong>Example CSV:</strong>
              <pre style={{ margin: '10px 0', fontSize: '13px', color: '#333' }}>
Email,FirstName,LastName,Company,JobTitle,Phone,Tags<br/>
john@example.com,John,Doe,Acme Inc,Manager,123-456-7890,tag1,tag2<br/>
jane@example.com,Jane,Smith,Tech Corp,Developer,987-654-3210,tag3,tag4
              </pre>
            </div>
            <p style={{ color: '#666', fontSize: '14px', marginBottom: '15px' }}>
              <strong>Note:</strong> You'll be able to review new contacts before importing. Duplicate emails will be skipped.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <label className="btn btn-primary" style={{ cursor: 'pointer', margin: 0 }}>
              Choose CSV File
              <input
                type="file"
                accept=".csv"
                onChange={handleCSVUpload}
                style={{ display: 'none' }}
              />
            </label>
            <button onClick={() => setShowCSVDialog(false)} className="btn btn-secondary">
              Cancel
            </button>
          </div>
        </div>
      )}

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
        <h2>Contact List ({filteredContacts.length})</h2>
        {filteredContacts.length === 0 ? (
          <p>No contacts found. {selectedList ? 'This list is empty.' : 'Sync from Outlook or add manually.'}</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th style={{ width: '40px' }}>
                  <input
                    type="checkbox"
                    checked={selectedContacts.length === filteredContacts.length && filteredContacts.length > 0}
                    onChange={toggleAllContacts}
                    style={{ cursor: 'pointer' }}
                  />
                </th>
                <th>Name</th>
                <th>Email</th>
                <th>Company</th>
                <th>Job Title</th>
                <th>Lists</th>
                <th style={{ width: '120px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredContacts.map((contact) => {
                const assignedLists = contactListMap[contact.ContactId] || [];
                return (
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
                    {assignedLists.length > 0 ? (
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        {assignedLists.join(', ')}
                      </div>
                    ) : (
                      <span style={{ color: '#999', fontStyle: 'italic', fontSize: '12px' }}>
                        None
                      </span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <button 
                        onClick={() => handleEdit(contact)} 
                        disabled={deleting}
                        title="Edit contact"
                        style={{ 
                          background: 'none', 
                          border: 'none', 
                          cursor: 'pointer', 
                          fontSize: '18px',
                          padding: '4px'
                        }}
                      >
                        ✏️
                      </button>
                      <button 
                        onClick={() => setConfirmDelete({ show: true, type: 'contact', id: contact.ContactId, name: null, count: null })} 
                        disabled={deleting}
                        title="Delete contact"
                        style={{ 
                          background: 'none', 
                          border: 'none', 
                          cursor: 'pointer', 
                          fontSize: '18px',
                          padding: '4px'
                        }}
                      >
                        {deleting ? '🔄' : '🗑️'}
                      </button>
                      {!selectedList && lists.length > 0 && (
                        <button 
                          onClick={() => { 
                            setContactToAssign(contact.ContactId);
                            // Initialize with lists this contact is already in
                            const assignedLists = contactListMap[contact.ContactId] || [];
                            const initialLists = lists.filter(list => assignedLists.includes(list.Name)).map(list => list.ListId);
                            setSelectedListIds(initialLists);
                            setShowAddToListDialog(true);
                          }} 
                          disabled={deleting}
                          title="Add to list"
                          style={{ 
                            background: 'none', 
                            border: 'none', 
                            cursor: 'pointer', 
                            fontSize: '18px',
                            padding: '4px'
                          }}
                        >
                          ➕
                        </button>
                      )}
                      {selectedList && (
                        <button 
                          onClick={() => handleRemoveFromList(contact.ContactId)} 
                          disabled={deleting}
                          title="Remove from list"
                          style={{ 
                            background: 'none', 
                            border: 'none', 
                            cursor: 'pointer', 
                            fontSize: '18px',
                            padding: '4px'
                          }}
                        >
                          ➖
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <ConfirmModal
        show={confirmDelete.show}
        title={confirmDelete.type === 'list' ? 'Delete List' : confirmDelete.type === 'bulk' ? 'Delete Multiple Contacts' : 'Delete Contact'}
        message={
          confirmDelete.type === 'list' 
            ? `Are you sure you want to delete the list "${confirmDelete.name}"? Contacts will not be deleted.`
            : confirmDelete.type === 'bulk'
            ? `Are you sure you want to delete ${confirmDelete.count} selected contact${confirmDelete.count !== 1 ? 's' : ''}? This cannot be undone!`
            : 'Are you sure you want to delete this contact? This action cannot be undone.'
        }
        onConfirm={confirmDelete.type === 'list' ? handleDeleteList : confirmDelete.type === 'bulk' ? handleBulkDelete : handleDelete}
        onCancel={() => setConfirmDelete({ show: false, type: null, id: null, name: null, count: null })}
        confirmText="Delete"
        confirmStyle="danger"
      />

      <SuccessModal
        show={successMessage.show}
        title={successMessage.title}
        message={successMessage.message}
        onClose={() => setSuccessMessage({ show: false, title: '', message: '' })}
      />

      {/* CSV Import Preview Modal */}
      {showPreviewModal && (
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
          zIndex: 2000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '24px',
            borderRadius: '8px',
            width: '90%',
            maxWidth: '800px',
            maxHeight: '80vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ marginTop: 0, marginBottom: '16px' }}>Preview New Contacts</h2>
            <p style={{ marginBottom: '16px', color: '#666' }}>
              {previewContacts.length} new contact{previewContacts.length !== 1 ? 's' : ''} found. 
              Select the contacts you want to import:
            </p>
            
            {lists.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Add imported contacts to list (optional):
                </label>
                <select 
                  value={importTargetList || ''} 
                  onChange={(e) => setImportTargetList(e.target.value ? parseInt(e.target.value) : null)}
                  style={{ 
                    width: '100%', 
                    padding: '8px', 
                    borderRadius: '4px', 
                    border: '1px solid #ddd',
                    fontSize: '14px'
                  }}
                >
                  <option value="">-- Don't add to any list --</option>
                  {lists.map(list => (
                    <option key={list.ListId} value={list.ListId}>
                      {list.Name} ({list.ContactCount} contacts)
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div style={{ 
              flex: 1, 
              overflowY: 'auto', 
              border: '1px solid #ddd', 
              borderRadius: '4px',
              marginBottom: '16px'
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ position: 'sticky', top: 0, backgroundColor: '#f5f5f5' }}>
                  <tr>
                    <th style={{ padding: '8px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>
                      <input
                        type="checkbox"
                        checked={selectedPreviewContacts.length === previewContacts.length}
                        onChange={toggleAllPreviewContacts}
                      />
                    </th>
                    <th style={{ padding: '8px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Name</th>
                    <th style={{ padding: '8px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Email</th>
                    <th style={{ padding: '8px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Company</th>
                    <th style={{ padding: '8px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Job Title</th>
                  </tr>
                </thead>
                <tbody>
                  {previewContacts.map((contact, index) => (
                    <tr 
                      key={index}
                      style={{ 
                        backgroundColor: selectedPreviewContacts.includes(index) ? '#f0f8ff' : 'white',
                        cursor: 'pointer'
                      }}
                      onClick={() => togglePreviewContact(index)}
                    >
                      <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>
                        <input
                          type="checkbox"
                          checked={selectedPreviewContacts.includes(index)}
                          onChange={() => togglePreviewContact(index)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>
                        {contact.firstName} {contact.lastName}
                      </td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{contact.email}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{contact.company}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{contact.jobTitle}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ color: '#666', fontSize: '14px' }}>
                {selectedPreviewContacts.length} of {previewContacts.length} selected
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  onClick={() => {
                    setShowPreviewModal(false);
                    setPreviewContacts([]);
                    setSelectedPreviewContacts([]);
                    setImportTargetList(null);
                  }}
                  style={{
                    padding: '8px 16px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    backgroundColor: 'white'
                  }}
                >
                  Cancel
                </button>
                <button 
                  onClick={handleConfirmImport}
                  disabled={selectedPreviewContacts.length === 0}
                  style={{
                    padding: '8px 16px',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: selectedPreviewContacts.length === 0 ? 'not-allowed' : 'pointer',
                    backgroundColor: selectedPreviewContacts.length === 0 ? '#ccc' : '#007bff',
                    color: 'white',
                    fontWeight: 'bold'
                  }}
                >
                  Import {selectedPreviewContacts.length} Contact{selectedPreviewContacts.length !== 1 ? 's' : ''}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Contacts;

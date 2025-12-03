import React, { useEffect, useState } from 'react';
import { templatesAPI } from '../services/api.jsx';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const Templates = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [viewingTemplate, setViewingTemplate] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    body: '',
    description: ''
  });

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const response = await templatesAPI.getAll();
      setTemplates(response.data);
    } catch (err) {
      console.error('Failed to load templates', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await templatesAPI.update(editingId, formData);
      } else {
        await templatesAPI.create(formData);
      }
      setShowForm(false);
      setEditingId(null);
      setFormData({ name: '', subject: '', body: '', description: '' });
      await loadTemplates();
    } catch (err) {
      alert(`Failed to ${editingId ? 'update' : 'create'} template: ` + err.response?.data?.error);
    }
  };

  const handleView = async (id) => {
    try {
      const response = await templatesAPI.getOne(id);
      setViewingTemplate(response.data);
    } catch (err) {
      alert('Failed to load template details');
    }
  };

  const handleEdit = async (id) => {
    try {
      const response = await templatesAPI.getOne(id);
      const template = response.data;
      setFormData({
        name: template.Name,
        subject: template.Subject,
        body: template.Body,
        description: template.Description || ''
      });
      setEditingId(id);
      setShowForm(true);
      setViewingTemplate(null);
    } catch (err) {
      alert('Failed to load template for editing');
    }
  };

  const handleCancelEdit = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({ name: '', subject: '', body: '', description: '' });
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this template?')) {
      try {
        await templatesAPI.delete(id);
        await loadTemplates();
      } catch (err) {
        alert('Failed to delete template');
      }
    }
  };

  if (loading) return <div className="loading">Loading templates...</div>;

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>Email Templates</h1>
        <button onClick={() => editingId ? handleCancelEdit() : setShowForm(!showForm)} className="btn btn-primary">
          {showForm ? 'Cancel' : 'Create Template'}
        </button>
      </div>

      {showForm && (
        <div className="card">
          <h2>{editingId ? 'Edit Template' : 'New Template'}</h2>
          <form onSubmit={handleSubmit}>
            <input
              type="text"
              placeholder="Template Name *"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <input
              type="text"
              placeholder="Subject Line *"
              required
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
            />
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Email Body *</label>
              <ReactQuill
                theme="snow"
                value={formData.body}
                onChange={(content) => setFormData({ ...formData, body: content })}
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
                placeholder="Type your email content here... Use {{FirstName}}, {{LastName}}, {{Company}}, etc. for personalization"
              />
            </div>
            <textarea
              placeholder="Description (optional)"
              rows="3"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="submit" className="btn btn-primary">
                {editingId ? 'Update Template' : 'Create Template'}
              </button>
              {editingId && (
                <button type="button" onClick={handleCancelEdit} className="btn" style={{ backgroundColor: '#6c757d', color: 'white' }}>
                  Cancel
                </button>
              )}
            </div>
          </form>
          <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
            <h3 style={{ marginBottom: '10px' }}>Available Placeholders:</h3>
            <code>{'{{FirstName}}, {{LastName}}, {{Email}}, {{Company}}, {{JobTitle}}'}</code>
          </div>
        </div>
      )}

      <div className="card">
        <h2>Template Library ({templates.length})</h2>
        {templates.length === 0 ? (
          <p>No templates found. Create your first template to get started.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Subject</th>
                <th>Description</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {templates.map((template) => (
                <tr key={template.TemplateId}>
                  <td><strong>{template.Name}</strong></td>
                  <td>{template.Subject}</td>
                  <td>{template.Description}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <button 
                        onClick={() => handleView(template.TemplateId)} 
                        className="btn btn-primary"
                        style={{ padding: '5px 10px', fontSize: '12px' }}
                      >
                        View
                      </button>
                      <button 
                        onClick={() => handleEdit(template.TemplateId)} 
                        className="btn"
                        style={{ padding: '5px 10px', fontSize: '12px', backgroundColor: '#ffc107', color: '#000' }}
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => handleDelete(template.TemplateId)} 
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

      {viewingTemplate && (
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
          <div className="card" style={{
            maxWidth: '800px',
            width: '90%',
            maxHeight: '90vh',
            overflow: 'auto',
            margin: 0
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2>Template Details</h2>
              <button 
                onClick={() => setViewingTemplate(null)} 
                className="btn"
                style={{ backgroundColor: '#6c757d', color: 'white' }}
              >
                Close
              </button>
            </div>
            
            <div style={{ marginBottom: '15px' }}>
              <strong>Name:</strong>
              <p style={{ marginTop: '5px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
                {viewingTemplate.Name}
              </p>
            </div>
            
            <div style={{ marginBottom: '15px' }}>
              <strong>Subject:</strong>
              <p style={{ marginTop: '5px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
                {viewingTemplate.Subject}
              </p>
            </div>
            
            <div style={{ marginBottom: '15px' }}>
              <strong>Body:</strong>
              <div style={{ 
                marginTop: '5px', 
                padding: '10px', 
                backgroundColor: '#f8f9fa', 
                borderRadius: '4px',
                border: '1px solid #dee2e6'
              }}
              dangerouslySetInnerHTML={{ __html: viewingTemplate.Body }}
              />
            </div>
            
            {viewingTemplate.Description && (
              <div style={{ marginBottom: '15px' }}>
                <strong>Description:</strong>
                <p style={{ marginTop: '5px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
                  {viewingTemplate.Description}
                </p>
              </div>
            )}
            
            <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
              <button 
                onClick={() => {
                  handleEdit(viewingTemplate.TemplateId);
                }} 
                className="btn"
                style={{ backgroundColor: '#ffc107', color: '#000' }}
              >
                Edit Template
              </button>
              <button 
                onClick={() => setViewingTemplate(null)} 
                className="btn"
                style={{ backgroundColor: '#6c757d', color: 'white' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Templates;

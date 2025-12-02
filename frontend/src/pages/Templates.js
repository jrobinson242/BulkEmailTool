import React, { useEffect, useState } from 'react';
import { templatesAPI } from '../services/api';

const Templates = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
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
      await templatesAPI.create(formData);
      setShowForm(false);
      setFormData({ name: '', subject: '', body: '', description: '' });
      await loadTemplates();
    } catch (err) {
      alert('Failed to create template: ' + err.response?.data?.error);
    }
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
        <button onClick={() => setShowForm(!showForm)} className="btn btn-primary">
          {showForm ? 'Cancel' : 'Create Template'}
        </button>
      </div>

      {showForm && (
        <div className="card">
          <h2>New Template</h2>
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
            <textarea
              placeholder="Email Body * (Use {{FirstName}}, {{LastName}}, {{Company}}, etc. for personalization)"
              required
              rows="10"
              value={formData.body}
              onChange={(e) => setFormData({ ...formData, body: e.target.value })}
            />
            <textarea
              placeholder="Description (optional)"
              rows="3"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
            <button type="submit" className="btn btn-primary">Create Template</button>
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
                    <button 
                      onClick={() => handleDelete(template.TemplateId)} 
                      className="btn btn-danger"
                      style={{ padding: '5px 10px', fontSize: '12px' }}
                    >
                      Delete
                    </button>
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

export default Templates;

import React, { useEffect, useState } from 'react';
import { analyticsAPI, queueAPI } from '../services/api.jsx';
import './Dashboard.css';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [clearing, setClearing] = useState(false);
  const [clearMessage, setClearMessage] = useState('');

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const response = await analyticsAPI.getDashboard();
      setStats(response.data);
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleClearQueue = async () => {
    if (!confirm('This will clear all queued and failed email logs, plus any stuck messages in the queue. Continue?')) {
      return;
    }

    try {
      setClearing(true);
      setClearMessage('');
      const response = await queueAPI.clear();
      setClearMessage(`✅ ${response.data.message} (${response.data.logsCleared} database logs cleared, queue purged)`);
      // Reload dashboard to update stats
      await loadDashboard();
    } catch (err) {
      setClearMessage('❌ Failed to clear queue: ' + (err.response?.data?.error || err.message));
      console.error(err);
    } finally {
      setClearing(false);
    }
  };

  if (loading) return <div className="loading">Loading dashboard...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="container">
      <h1>Dashboard</h1>
      
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats?.totalCampaigns || 0}</div>
          <div className="stat-label">Total Campaigns</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-value">{stats?.totalContacts || 0}</div>
          <div className="stat-label">Total Contacts</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-value">{stats?.totalEmailsSent || 0}</div>
          <div className="stat-label">Emails Sent</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-value">{stats?.overallOpenRate || 0}%</div>
          <div className="stat-label">Open Rate</div>
        </div>
      </div>

      <div className="card">
        <h2>Quick Actions</h2>
        <div className="action-buttons">
          <a href="/contacts" className="btn btn-primary">Manage Contacts</a>
          <a href="/templates" className="btn btn-primary">Create Template</a>
          <a href="/campaigns" className="btn btn-primary">New Campaign</a>
          <button 
            onClick={handleClearQueue} 
            className="btn btn-secondary"
            disabled={clearing}
            style={{ marginLeft: '1rem' }}
          >
            {clearing ? '🔄 Clearing Queue...' : '🗑️ Clear Queue'}
          </button>
        </div>
        {clearMessage && (
          <div style={{ marginTop: '1rem', padding: '0.5rem', backgroundColor: '#f0f0f0', borderRadius: '4px' }}>
            {clearMessage}
          </div>
        )}
      </div>

      {((stats?.totalQueued || 0) > 0 || (stats?.totalFailed || 0) > 0) && (
        <div className="card">
          <h2>Queue Status</h2>
          <div style={{ display: 'flex', gap: '2rem' }}>
            <div>
              <strong style={{ fontSize: '1.5rem', color: '#f0ad4e' }}>{stats?.totalQueued || 0}</strong>
              <div style={{ color: '#666', fontSize: '0.9rem' }}>Queued Emails</div>
            </div>
            <div>
              <strong style={{ fontSize: '1.5rem', color: '#d9534f' }}>{stats?.totalFailed || 0}</strong>
              <div style={{ color: '#666', fontSize: '0.9rem' }}>Failed Emails</div>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <h2>Engagement Overview</h2>
        <div className="engagement-stats">
          <div className="engagement-row">
            <span>Total Opened:</span>
            <strong>{stats?.totalOpened || 0}</strong>
          </div>
          <div className="engagement-row">
            <span>Total Clicked:</span>
            <strong>{stats?.totalClicked || 0}</strong>
          </div>
          <div className="engagement-row">
            <span>Click Rate:</span>
            <strong>{stats?.overallClickRate || 0}%</strong>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

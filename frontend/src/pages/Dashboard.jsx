import React, { useEffect, useState } from 'react';
import { analyticsAPI } from '../services/api.jsx';
import './Dashboard.css';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
        </div>
      </div>

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

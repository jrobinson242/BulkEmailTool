import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { campaignsAPI, analyticsAPI } from '../services/api.jsx';

const CampaignDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState(null);
  const [stats, setStats] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

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
    } catch (err) {
      console.error('Failed to load campaign data', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">Loading campaign...</div>;
  if (!campaign) return <div className="error">Campaign not found</div>;

  return (
    <div className="container">
      <button onClick={() => navigate('/campaigns')} className="btn btn-secondary" style={{ marginBottom: '20px' }}>
        ← Back to Campaigns
      </button>

      <div className="card">
        <h1>{campaign.Name}</h1>
        <p><strong>Template:</strong> {campaign.TemplateName}</p>
        <p><strong>Subject:</strong> {campaign.Subject}</p>
        <p><strong>Status:</strong> {campaign.Status}</p>
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
    </div>
  );
};

export default CampaignDetail;

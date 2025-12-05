import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Login.css';

const Login = () => {
  const { login, handleCallback, isAuthenticated } = useAuth();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const callbackProcessed = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const code = params.get('code');

    if (code && !callbackProcessed.current) {
      callbackProcessed.current = true;
      setLoading(true);
      handleCallback(code)
        .then(() => {
          navigate('/');
        })
        .catch((err) => {
          setError('Authentication failed. Please try again.');
          setLoading(false);
          callbackProcessed.current = false;
        });
    } else if (isAuthenticated) {
      navigate('/');
    }
  }, [location, handleCallback, navigate, isAuthenticated]);

  const handleLogin = async () => {
    try {
      setLoading(true);
      setError('');
      await login();
    } catch (err) {
      setError('Failed to initiate login. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>Bulk Email Tool</h1>
        <p className="login-subtitle">Sign in with your Microsoft 365 account</p>
        
        {error && <div className="error">{error}</div>}
        
        {loading ? (
          <div className="loading">Authenticating...</div>
        ) : (
          <button onClick={handleLogin} className="btn btn-primary btn-large">
            Sign in with Microsoft
          </button>
        )}
        
        <div className="login-info">
          <h3>Features:</h3>
          <ul>
            <li>Sync contacts from Outlook</li>
            <li>Create personalized email templates</li>
            <li>Send bulk emails with tracking</li>
            <li>View analytics and engagement metrics</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Login;

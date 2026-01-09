
import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Navbar.css';

const Navbar = () => {
  const { isAuthenticated, user, logout, effectiveRole, roleOverride, setRoleOverride } = useAuth();

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to="/" style={{ color: 'white', textDecoration: 'none' }}>
          RSC Marketing Tool
        </Link>
      </div>

      {isAuthenticated && (
        <ul className="navbar-nav">
          <li><Link to="/">Dashboard</Link></li>
          <li><Link to="/contacts">Contacts</Link></li>
          <li><Link to="/templates">Templates</Link></li>
          <li><Link to="/campaigns">Campaigns</Link></li>
          <li><Link to="/rate-calculator">Rate Calculator</Link></li>
          {(effectiveRole === 'admin' || effectiveRole === 'superuser') && (
            <li><Link to="/admin">Admin</Link></li>
          )}
        </ul>
      )}

      <div className="navbar-user" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {/* Role switcher for superuser */}
        {isAuthenticated && user?.role === 'superuser' && (
          <select
            value={roleOverride || user.role}
            onChange={e => setRoleOverride(e.target.value === user.role ? null : e.target.value)}
            style={{ marginRight: '10px', padding: '4px 8px', borderRadius: '4px' }}
            title="Preview as role"
          >
            <option value={user.role}>👑 Superuser (actual)</option>
            <option value="admin">Admin (same as superuser)</option>
            <option value="template_creator">Template Creator</option>
            <option value="user">User</option>
            <option value="readonly">Readonly</option>
          </select>
        )}
        {isAuthenticated ? (
          <>
            <span style={{ marginRight: '15px' }}>{user?.displayName || user?.mail}</span>
            <button onClick={logout} className="btn btn-secondary">Logout</button>
          </>
        ) : null}
      </div>
    </nav>
  );
};

export default Navbar;

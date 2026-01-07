import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Navbar.css';

const Navbar = () => {
  const { isAuthenticated, user, logout } = useAuth();

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
        </ul>
      )}
      
      <div className="navbar-user">
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

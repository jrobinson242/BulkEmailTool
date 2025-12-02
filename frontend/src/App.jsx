import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext.jsx';
import Navbar from './components/Navbar.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Contacts from './pages/Contacts.jsx';
import Templates from './pages/Templates.jsx';
import Campaigns from './pages/Campaigns.jsx';
import CampaignDetail from './pages/CampaignDetail.jsx';
import PrivateRoute from './components/PrivateRoute.jsx';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Navbar />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/auth/callback" element={<Login />} />
            <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
            <Route path="/contacts" element={<PrivateRoute><Contacts /></PrivateRoute>} />
            <Route path="/templates" element={<PrivateRoute><Templates /></PrivateRoute>} />
            <Route path="/campaigns" element={<PrivateRoute><Campaigns /></PrivateRoute>} />
            <Route path="/campaigns/:id" element={<PrivateRoute><CampaignDetail /></PrivateRoute>} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;

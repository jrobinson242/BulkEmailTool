import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';

import App from './App.jsx';
import { MSALAuthProvider } from './auth/MSALAuthProvider.jsx';


const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <MSALAuthProvider>
      <App />
    </MSALAuthProvider>
  </React.StrictMode>
);

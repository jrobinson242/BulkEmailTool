import React, { createContext, useState, useContext, useEffect } from 'react';
import { authAPI } from '../services/api.jsx';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('accessToken');
      if (token) {
        try {
          const response = await authAPI.getProfile();
          setUser(response.data);
        } catch (error) {
          console.error('Failed to load user profile', error);
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async () => {
    try {
      const response = await authAPI.login();
      window.location.href = response.data.authUrl;
    } catch (error) {
      console.error('Login failed', error);
      throw error;
    }
  };

  const handleCallback = async (code) => {
    try {
      const response = await authAPI.callback(code);
      const { accessToken, refreshToken } = response.data;
      
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      
      const profileResponse = await authAPI.getProfile();
      setUser(profileResponse.data);
      
      return true;
    } catch (error) {
      console.error('Callback failed', error);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
  };

  const value = {
    user,
    loading,
    login,
    logout,
    handleCallback,
    isAuthenticated: !!user
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

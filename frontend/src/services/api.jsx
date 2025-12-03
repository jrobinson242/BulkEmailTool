import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';


const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle token refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const response = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
        
        const { accessToken } = response.data;
        localStorage.setItem('accessToken', accessToken);
        
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: () => api.get('/auth/login'),
  callback: (code) => api.post('/auth/callback', { code }),
  getProfile: () => api.get('/auth/me')
};

// Contacts API
export const contactsAPI = {
  getAll: () => api.get('/contacts'),
  getFolders: () => api.get('/contacts/folders'),
  sync: (folderIds) => api.post('/contacts/sync', { folderIds }),
  create: (data) => api.post('/contacts', data),
  update: (id, data) => api.put(`/contacts/${id}`, data),
  delete: (id) => api.delete(`/contacts/${id}`),
  bulkDelete: () => api.delete('/contacts'),
  import: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/contacts/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  }
};

// Templates API
export const templatesAPI = {
  getAll: () => api.get('/templates'),
  getOne: (id) => api.get(`/templates/${id}`),
  create: (data) => api.post('/templates', data),
  update: (id, data) => api.put(`/templates/${id}`, data),
  delete: (id) => api.delete(`/templates/${id}`),
  preview: (id, sampleData) => api.post(`/templates/${id}/preview`, { sampleData })
};

// Campaigns API
export const campaignsAPI = {
  getAll: () => api.get('/campaigns'),
  getOne: (id) => api.get(`/campaigns/${id}`),
  create: (data) => api.post('/campaigns', data),
  update: (id, data) => api.put(`/campaigns/${id}`, data),
  send: (id) => api.post(`/campaigns/${id}/send`),
  stop: (id) => api.post(`/campaigns/${id}/stop`),
  getLogs: (id) => api.get(`/campaigns/${id}/logs`),
  getContacts: (id) => api.get(`/campaigns/${id}/contacts`),
  delete: (id) => api.delete(`/campaigns/${id}`)
};

// Analytics API
export const analyticsAPI = {
  getDashboard: () => api.get('/analytics/dashboard'),
  getCampaignStats: (id) => api.get(`/analytics/campaign/${id}`),
  trackClick: (campaignId, contactId) => 
    api.post('/analytics/click', { campaignId, contactId })
};

// Queue API
export const queueAPI = {
  clear: () => api.delete('/queue/clear')
};

export default api;

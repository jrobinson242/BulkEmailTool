import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

// Create axios instance with auth token
const getAuthHeaders = () => {
  const token = localStorage.getItem('accessToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const rateClientsAPI = {
  // Get all clients
  getClients: () => axios.get(`${API_BASE_URL}/rate-calculator/clients`, {
    headers: getAuthHeaders()
  }),

  // Create a new client
  createClient: (clientData) =>
    axios.post(`${API_BASE_URL}/rate-calculator/clients`, clientData, {
      headers: getAuthHeaders()
    }),

  // Update a client
  updateClient: (clientId, clientData) =>
    axios.put(`${API_BASE_URL}/rate-calculator/clients/${clientId}`, clientData, {
      headers: getAuthHeaders()
    }),

  // Delete a client
  deleteClient: (clientId) =>
    axios.delete(`${API_BASE_URL}/rate-calculator/clients/${clientId}`, {
      headers: getAuthHeaders()
    }),

  // Upload clients from CSV file
  uploadClientsFromCSV: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return axios.post(`${API_BASE_URL}/rate-calculator/clients/upload-csv`, formData, {
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'multipart/form-data'
      }
    });
  }
};

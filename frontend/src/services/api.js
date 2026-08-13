import axios from 'axios';

const getBaseUrl = () => {
  if (process.env.NODE_ENV === 'production') {
    return '/api';
  }
  return process.env.REACT_APP_API_URL || 'http://localhost:5005/api';
};

const api = axios.create({
  baseURL: getBaseUrl()
});

// CLEANUP: Remove any old auto-generated ghost tickets from localStorage
try {
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith('mock_ticket_')) {
      localStorage.removeItem(key);
    }
  });
} catch (e) {}

// Attach JWT to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Mocking the backend for frontend UI testing
api.interceptors.response.use((res) => res, (err) => Promise.reject(err));

export default api;
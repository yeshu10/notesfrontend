import axios from 'axios';
import { store } from '../store';
import { logout } from '../store/slices/authSlice';
import { clearNotes } from '../store/slices/notesSlice';
import debounce from 'lodash/debounce';

// Track the current getAllNotes request
let currentNotesRequest = null;
let backendURL = import.meta.env.VITE_BACKEND_URL;

const api = axios.create({
  baseURL: `${backendURL}/api`|| 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = store.getState().auth.token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('API request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.log('401 Unauthorized response, logging out user');
      store.dispatch(logout());
      store.dispatch(clearNotes());
    }
    // Format error message
    const message = error.response?.data?.message || error.message;
    error.message = message;
    return Promise.reject(error);
  }
);

// Debounce API calls
const debouncedGet = debounce((url, config) => api.get(url, config), 300);

export const authAPI = {
  login: async (email, password) => {
    try {
      console.log('Attempting login for:', email);
      const response = await api.post('/auth/login', { email, password });
      console.log('Login successful');
      return response.data;
    } catch (error) {
      console.error('Login failed:', error);
      throw new Error(error.response?.data?.message || 'Login failed');
    }
  },
  register: async (name, email, password) => {
    try {
      console.log('Attempting registration for:', email);
      const response = await api.post('/auth/register', { name, email, password });
      console.log('Registration successful');
      return response.data;
    } catch (error) {
      console.error('Registration failed:', error);
      throw new Error(error.response?.data?.message || 'Registration failed');
    }
  },
};

export const notesAPI = {
  getAllNotes: async (page = 1, limit = 10, showArchived = false) => {
    try {
      // Cancel previous request if it exists
      if (currentNotesRequest) {
        console.log('Cancelling previous notes request');
        currentNotesRequest.cancel();
      }
      
      // Create a new cancel token
      const CancelToken = axios.CancelToken;
      const source = CancelToken.source();
      currentNotesRequest = source;
      
      console.log('Fetching notes with params:', { page, limit, showArchived });
      
      // Use regular API call with cancel token
      const response = await api.get('/notes', {
        params: { page, limit, showArchived },
        cancelToken: source.token
      });
      
      // Clear the request reference once complete
      currentNotesRequest = null;
      
      console.log('Got notes response:', response.data);
      return response.data;
    } catch (error) {
      // Don't log errors for cancelled requests
      if (axios.isCancel(error)) {
        console.log('Request was cancelled:', error.message);
        throw new Error('Request cancelled');
      }
      
      console.error('Failed to fetch notes:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch notes');
    }
  },
  getNote: async (id) => {
    try {
      const response = await api.get(`/notes/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch note');
    }
  },
  createNote: async (title, content = '') => {
    try {
      const response = await api.post('/notes', { 
        title: title.trim(),
        content: content.trim() || 'New note'
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to create note');
    }
  },
  updateNote: async (id, data) => {
    try {
      const response = await api.patch(`/notes/${id}`, data);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to update note');
    }
  },
  deleteNote: async (id) => {
    try {
      const response = await api.delete(`/notes/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to delete note');
    }
  },
  shareNote: async (id, email, permission) => {
    try {
      console.log(`Sharing note ${id} with ${email}, permission: ${permission}`);
      const response = await api.post(`/notes/${id}/share`, { email, permission });
      console.log('Share successful:', response.data);
      return response.data;
    } catch (error) {
      console.error('Share note error:', error);
      // Provide more specific error messages
      if (error.response?.status === 404) {
        if (error.response?.data?.message === 'User not found') {
          throw new Error(`User with email ${email} is not registered in the system. They need to create an account first.`);
        } else {
          throw new Error('Note or user not found');
        }
      } else if (error.response?.status === 403) {
        throw new Error('You do not have permission to share this note');
      } else if (error.response?.status === 500) {
        throw new Error('Server error while sharing note. Please try again later.');
      }
      throw new Error(error.response?.data?.message || 'Failed to share note');
    }
  },
};

export default api; 
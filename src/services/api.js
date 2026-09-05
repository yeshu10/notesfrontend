import axios from 'axios';
import { store } from '../store';
import { logout } from '../store/slices/authSlice';
import { clearNotes } from '../store/slices/notesSlice';

let currentNotesRequest = null;
const backendURL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: `${backendURL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = store.getState().auth?.token || localStorage.getItem('token');
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
    const message = error.response?.data?.message || error.message;
    error.message = message;
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Login failed');
    }
  },
  register: async (name, email, password) => {
    try {
      const response = await api.post('/auth/register', { name, email, password });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Registration failed');
    }
  },
};

const extractId = (id) => {
  if (!id) return '';
  if (typeof id === 'string') return id;
  if (typeof id === 'object') {
    return id._id || id.id || String(id);
  }
  return String(id);
};

export const notesAPI = {
  getAllNotes: async (params = {}) => {
    try {
      let queryParams = {};
      if (typeof params === 'number') {
        queryParams = { page: params, limit: 12, filter: 'all' };
      } else {
        const {
          page = 1,
          limit = 12,
          filter = 'all',
          tag = '',
          search = '',
          sort = 'updated',
          showArchived = false
        } = params || {};
        const effectiveFilter = showArchived ? 'archived' : filter;
        queryParams = { page, limit, filter: effectiveFilter, tag, search, sort };
      }

      const response = await api.get('/notes', {
        params: queryParams
      });

      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch notes');
    }
  },

  getNote: async (id) => {
    try {
      const noteId = extractId(id);
      const response = await api.get(`/notes/${noteId}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch note');
    }
  },

  createNote: async (titleData, contentArg = '') => {
    try {
      let body = {};
      if (typeof titleData === 'object') {
        body = {
          title: (titleData.title || 'Untitled Note').trim(),
          content: (titleData.content || '').trim(),
          tags: titleData.tags || [],
          color: titleData.color || 'default',
          isPinned: !!titleData.isPinned
        };
      } else {
        body = {
          title: (titleData || 'Untitled Note').trim(),
          content: (contentArg || '').trim()
        };
      }

      const response = await api.post('/notes', body);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to create note');
    }
  },

  updateNote: async (id, data) => {
    try {
      const noteId = extractId(id);
      const response = await api.patch(`/notes/${noteId}`, data);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to update note');
    }
  },

  deleteNote: async (id) => {
    try {
      const noteId = extractId(id);
      const response = await api.delete(`/notes/${noteId}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to delete note');
    }
  },

  restoreNote: async (id) => {
    try {
      const noteId = extractId(id);
      const response = await api.patch(`/notes/${noteId}/restore`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to restore note');
    }
  },

  emptyTrash: async () => {
    try {
      const response = await api.delete('/notes/trash/empty');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to empty trash');
    }
  },

  shareNote: async (id, email, permission = 'read') => {
    try {
      const noteId = extractId(id);
      const response = await api.post(`/notes/${noteId}/share`, { email, permission });
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        throw new Error(error.response?.data?.message || `User with email ${email} was not found`);
      } else if (error.response?.status === 403) {
        throw new Error('Only the note owner can manage share access');
      }
      throw new Error(error.response?.data?.message || 'Failed to share note');
    }
  },

  removeCollaborator: async (id, collaboratorId) => {
    try {
      const noteId = extractId(id);
      const response = await api.delete(`/notes/${noteId}/share/${collaboratorId}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to remove collaborator');
    }
  },

  getUserTags: async () => {
    try {
      const response = await api.get('/notes/tags');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch tags');
    }
  },

  searchUsers: async (query) => {
    try {
      const response = await api.get('/notes/users/search', { params: { query } });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to search users');
    }
  },

  getNoteVersions: async (id) => {
    try {
      const noteId = extractId(id);
      const response = await api.get(`/notes/${noteId}/versions`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch version history');
    }
  },

  getNoteVersion: async (id, versionId) => {
    try {
      const noteId = extractId(id);
      const response = await api.get(`/notes/${noteId}/versions/${versionId}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch version details');
    }
  },

  restoreNoteVersion: async (id, versionId) => {
    try {
      const noteId = extractId(id);
      const response = await api.post(`/notes/${noteId}/versions/${versionId}/restore`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to restore note version');
    }
  }
};

export const remindersAPI = {
  setReminder: async (noteId, date, time, reminderAt) => {
    try {
      const response = await api.post('/reminders', { noteId, date, time, reminderAt });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to set reminder');
    }
  },
  getReminders: async () => {
    try {
      const response = await api.get('/reminders');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch reminders');
    }
  },
  getNoteReminder: async (noteId) => {
    try {
      const response = await api.get(`/reminders/note/${noteId}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch note reminder');
    }
  },
  deleteReminder: async (noteId) => {
    try {
      const response = await api.delete(`/reminders/note/${noteId}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to remove reminder');
    }
  }
};

export default api;
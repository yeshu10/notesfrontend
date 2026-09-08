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
          type: titleData.type || 'text',
          content: (titleData.content || '').trim(),
          checklistItems: titleData.checklistItems || [],
          tags: titleData.tags || [],
          color: titleData.color || 'default',
          isPinned: !!titleData.isPinned
        };
      } else {
        body = {
          title: (titleData || 'Untitled Note').trim(),
          content: (contentArg || '').trim(),
          type: 'text'
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

  archiveNote: async (id) => {
    try {
      const noteId = extractId(id);
      const response = await api.patch(`/notes/${noteId}/archive`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to archive note');
    }
  },

  unarchiveNote: async (id) => {
    try {
      const noteId = extractId(id);
      const response = await api.patch(`/notes/${noteId}/unarchive`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to unarchive note');
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

export const commentsAPI = {
  getComments: async (noteId) => {
    try {
      const id = extractId(noteId);
      const response = await api.get(`/notes/${id}/comments`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch comments');
    }
  },

  addComment: async (noteId, content, parentCommentId = null) => {
    try {
      const id = extractId(noteId);
      const body = { content };
      if (parentCommentId) body.parentCommentId = extractId(parentCommentId);
      const response = await api.post(`/notes/${id}/comments`, body);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to add comment');
    }
  },

  updateComment: async (commentId, content, noteId = null) => {
    try {
      const id = extractId(commentId);
      const endpoint = noteId ? `/notes/${extractId(noteId)}/comments/${id}` : `/comments/${id}`;
      const response = await api.patch(endpoint, { content });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to update comment');
    }
  },

  deleteComment: async (commentId, noteId = null) => {
    try {
      const id = extractId(commentId);
      const endpoint = noteId ? `/notes/${extractId(noteId)}/comments/${id}` : `/comments/${id}`;
      const response = await api.delete(endpoint);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to delete comment');
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

export const attachmentsAPI = {
  /**
   * Fetch all attachments for a note.
   */
  getAttachments: async (noteId) => {
    try {
      const id = extractId(noteId);
      const response = await api.get(`/notes/${id}/attachments`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch attachments');
    }
  },

  /**
   * Upload a single file attachment to a note.
   * @param {string} noteId
   * @param {File} file  — the File object from an <input type="file">
   * @param {(percent: number) => void} [onUploadProgress]
   */
  uploadAttachment: async (noteId, file, onUploadProgress) => {
    try {
      const id = extractId(noteId);
      const formData = new FormData();
      formData.append('file', file);
      // Do NOT set Content-Type manually — axios auto-sets
      // 'multipart/form-data; boundary=...' when the body is FormData.
      // Overriding it strips the boundary and breaks multer parsing.
      const response = await api.post(`/notes/${id}/attachments`, formData, {
        onUploadProgress: onUploadProgress
          ? (progressEvent) => {
              if (progressEvent.total) {
                const percent = Math.round(
                  (progressEvent.loaded * 100) / progressEvent.total
                );
                onUploadProgress(percent);
              }
            }
          : undefined,
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Upload failed');
    }
  },

  /**
   * Delete an attachment (removes GridFS file + metadata).
   */
  deleteAttachment: async (attachmentId) => {
    try {
      const id = extractId(attachmentId);
      const response = await api.delete(`/attachments/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to delete attachment');
    }
  },

  /**
   * Fetch an attachment file as a Blob (authenticated).
   * Use URL.createObjectURL(blob) for images or to trigger downloads.
   */
  fetchAttachmentBlob: async (attachmentId) => {
    try {
      const id = extractId(attachmentId);
      const response = await api.get(`/attachments/${id}/file`, {
        responseType: 'blob',
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch file');
    }
  },
};

export default api;
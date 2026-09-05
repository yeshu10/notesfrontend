import { createSlice } from '@reduxjs/toolkit';

const getStoredUserId = () => {
  try {
    const userData = localStorage.getItem('user');
    if (!userData) return null;
    const parsed = JSON.parse(userData);
    return parsed?._id || parsed?.id || null;
  } catch (e) {
    return null;
  }
};

export const doesNoteMatchFilter = (note, activeFilter, selectedTag, currentUserId) => {
  if (!note) return false;

  const userId = currentUserId || getStoredUserId();
  const isTrashed = !!note.isTrashed;
  const isArchived = !!note.isArchived;
  const isPinned = !!note.isPinned;
  const isFavorite = !!note.isFavorite;

  // Determine ownership
  let isOwned = note.isOwnedByCurrentUser;
  if (userId && note.createdBy) {
    const creatorId = note.createdBy._id ? String(note.createdBy._id) : String(note.createdBy);
    isOwned = (creatorId === String(userId));
  }
  if (isOwned === undefined) {
    isOwned = true;
  }

  // Tag filter check
  if (selectedTag && selectedTag.trim()) {
    const noteTags = Array.isArray(note.tags) ? note.tags : [];
    const targetTag = selectedTag.trim().toLowerCase();
    const hasTag = noteTags.some(t => String(t).trim().toLowerCase() === targetTag);
    if (!hasTag) return false;
  }

  // Section filter check
  switch (activeFilter) {
    case 'trash':
      return isTrashed;
    case 'archived':
      return isArchived && !isTrashed;
    case 'mine':
      return !isTrashed && !isArchived && isOwned;
    case 'shared':
      return !isTrashed && !isArchived && !isOwned;
    case 'pinned':
      return !isTrashed && !isArchived && isPinned;
    case 'favorites':
    case 'saved':
      return !isTrashed && !isArchived && isFavorite;
    case 'reminders':
      return !isTrashed;
    case 'all':
    default:
      return !isTrashed && !isArchived;
  }
};

const getStoredFilter = () => {
  try {
    return localStorage.getItem('activeFilter') || 'all';
  } catch (e) {
    return 'all';
  }
};

const getStoredTag = () => {
  try {
    return localStorage.getItem('selectedTag') || '';
  } catch (e) {
    return '';
  }
};

const initialState = {
  notes: [],
  currentNote: null,
  tags: [],
  activeFilter: getStoredFilter(), // 'all' | 'mine' | 'shared' | 'pinned' | 'archived' | 'trash' | 'favorites' | 'saved'
  selectedTag: getStoredTag(),
  searchQuery: '',
  sortBy: 'updated',
  activeRoomUsers: [],
  pagination: null,
  loading: false,
  error: null,
  currentUserId: getStoredUserId(),
};

const notesSlice = createSlice({
  name: 'notes',
  initialState,
  reducers: {
    setCurrentUserId: (state, action) => {
      state.currentUserId = action.payload;
    },

    setNotes: (state, action) => {
      if (Array.isArray(action.payload)) {
        state.notes = action.payload;
      } else if (action.payload && Array.isArray(action.payload.notes)) {
        state.notes = action.payload.notes;
        if (action.payload.pagination) {
          state.pagination = action.payload.pagination;
        }
      } else {
        state.notes = [];
      }
      state.loading = false;
      state.error = null;
    },

    setPagination: (state, action) => {
      state.pagination = action.payload;
    },

    setCurrentNote: (state, action) => {
      state.currentNote = action.payload;
      if (action.payload) {
        const noteIndex = state.notes.findIndex(n => n._id === action.payload._id);
        if (noteIndex !== -1) {
          state.notes[noteIndex] = { ...state.notes[noteIndex], ...action.payload };
        }
      }
    },

    updateNote: (state, action) => {
      if (!action.payload || !action.payload._id) return;

      const payloadNote = action.payload;
      const index = state.notes.findIndex(n => n._id === payloadNote._id);
      const existing = index !== -1 ? state.notes[index] : null;
      const merged = existing ? { ...existing, ...payloadNote } : payloadNote;

      const matches = doesNoteMatchFilter(merged, state.activeFilter, state.selectedTag, state.currentUserId);

      if (matches) {
        if (index !== -1) {
          state.notes[index] = {
            ...merged,
            lastUpdated: payloadNote.lastUpdated || new Date().toISOString()
          };
        } else {
          state.notes.unshift({
            ...merged,
            lastUpdated: payloadNote.lastUpdated || new Date().toISOString()
          });
        }
      } else {
        if (index !== -1) {
          state.notes.splice(index, 1);
          if (state.pagination && state.pagination.totalNotes > 0) {
            state.pagination.totalNotes -= 1;
          }
        }
      }

      if (state.currentNote?._id === payloadNote._id) {
        state.currentNote = {
          ...state.currentNote,
          ...payloadNote,
          lastUpdated: payloadNote.lastUpdated || new Date().toISOString()
        };
      }
    },

    addNote: (state, action) => {
      if (!action.payload || !action.payload._id) return;
      const payloadNote = action.payload;
      const matches = doesNoteMatchFilter(payloadNote, state.activeFilter, state.selectedTag, state.currentUserId);
      const index = state.notes.findIndex(n => n._id === payloadNote._id);

      if (matches) {
        if (index === -1) {
          state.notes.unshift(payloadNote);
          if (state.pagination) {
            state.pagination.totalNotes = (state.pagination.totalNotes || 0) + 1;
          }
        } else {
          state.notes[index] = { ...state.notes[index], ...payloadNote };
        }
      } else if (index !== -1) {
        state.notes.splice(index, 1);
        if (state.pagination && state.pagination.totalNotes > 0) {
          state.pagination.totalNotes -= 1;
        }
      }
    },

    removeNote: (state, action) => {
      state.notes = state.notes.filter(n => n._id !== action.payload);
      if (state.pagination && state.pagination.totalNotes > 0) {
        state.pagination.totalNotes -= 1;
      }
      if (state.currentNote?._id === action.payload) {
        state.currentNote = null;
      }
    },

    setTags: (state, action) => {
      state.tags = Array.isArray(action.payload) ? action.payload : [];
    },

    addTagToStore: (state, action) => {
      const tag = String(action.payload).trim();
      if (tag && !state.tags.includes(tag)) {
        state.tags.push(tag);
      }
    },

    setActiveFilter: (state, action) => {
      state.activeFilter = action.payload;
      state.selectedTag = ''; // Clear selected tag when switching filters
      try {
        localStorage.setItem('activeFilter', action.payload);
        localStorage.removeItem('selectedTag');
      } catch (e) { }
      state.notes = [];
      state.loading = true;
    },

    setSelectedTag: (state, action) => {
      state.selectedTag = action.payload;
      if (action.payload && state.activeFilter !== 'all' && state.activeFilter !== 'mine') {
        state.activeFilter = 'all';
      }
      try {
        localStorage.setItem('selectedTag', action.payload);
        if (state.activeFilter) localStorage.setItem('activeFilter', state.activeFilter);
      } catch (e) { }
      state.notes = [];
      state.loading = true;
    },

    setSearchQuery: (state, action) => {
      state.searchQuery = action.payload;
    },

    setSortBy: (state, action) => {
      state.sortBy = action.payload;
    },

    setActiveRoomUsers: (state, action) => {
      state.activeRoomUsers = Array.isArray(action.payload) ? action.payload : [];
    },

    setLoading: (state, action) => {
      state.loading = action.payload;
    },

    setError: (state, action) => {
      state.error = action.payload;
      state.loading = false;
    },

    clearNotes: (state) => {
      state.notes = [];
      state.currentNote = null;
      state.tags = [];
      state.activeFilter = 'all';
      state.selectedTag = '';
      state.activeRoomUsers = [];
      state.pagination = null;
      state.loading = false;
      state.error = null;
      try {
        localStorage.removeItem('activeFilter');
        localStorage.removeItem('selectedTag');
      } catch (e) { }
    }
  },
});

export const {
  setCurrentUserId,
  setNotes,
  setPagination,
  setCurrentNote,
  updateNote,
  addNote,
  removeNote,
  setTags,
  addTagToStore,
  setActiveFilter,
  setSelectedTag,
  setSearchQuery,
  setSortBy,
  setActiveRoomUsers,
  setLoading,
  setError,
  clearNotes
} = notesSlice.actions;

export default notesSlice.reducer;

import { io } from 'socket.io-client';
import { store } from '../store';
import { updateNote, setActiveRoomUsers } from '../store/slices/notesSlice';
import { addNotification } from '../store/slices/notificationsSlice';
import toast from 'react-hot-toast';
import throttle from 'lodash/throttle';

const backendURL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

let socket = null;
let currentNoteId = null;
const noteUpdateListeners = new Set();

const playNotificationSound = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    // First note (E5 = ~659 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, ctx.currentTime);
    gain1.gain.setValueAtTime(0.15, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.3);

    // Second note (B5 = ~987 Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(987.77, ctx.currentTime + 0.12);
    gain2.gain.setValueAtTime(0.2, ctx.currentTime + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.12);
    osc2.stop(ctx.currentTime + 0.5);
  } catch (err) {
    // Ignore audio play errors silently if user hasn't interacted with DOM yet
  }
};

export const initializeSocket = (token) => {
  const authToken = token || localStorage.getItem('token');
  if (!authToken) return null;

  if (socket) {
    if (socket.connected) {
      if (currentNoteId) {
        socket.emit('join-note', currentNoteId);
      }
      return socket;
    }
    socket.auth = { token: authToken };
    socket.connect();
    return socket;
  }

  socket = io(backendURL, {
    auth: { token: authToken },
    reconnection: true,
    reconnectionDelay: 500,
    reconnectionDelayMax: 3000,
    reconnectionAttempts: 10,
    timeout: 10000,
    transports: ['websocket', 'polling']
  });

  socket.on('connect', () => {
    console.log('Socket connected');
    if (currentNoteId) {
      socket.emit('join-note', currentNoteId);
    }
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected');
    store.dispatch(setActiveRoomUsers([]));
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
  });

  socket.on('note-updated', (data) => {
    store.dispatch(updateNote(data));
    noteUpdateListeners.forEach((listener) => {
      try {
        listener(data);
      } catch (err) {
        console.error('Error in noteUpdateListener:', err);
      }
    });
  });

  socket.on('room-presence-updated', (data) => {
    if (String(data.noteId) === String(currentNoteId)) {
      store.dispatch(setActiveRoomUsers(data.activeUsers || []));
    }
  });

  socket.on('notification', (data) => {
    store.dispatch(addNotification(data));
    playNotificationSound();
    toast(data.message, {
      icon: data.type === 'REMINDER' ? '⏰' : '🔔',
      duration: 6000
    });
  });

  return socket;
};

export const subscribeToNoteUpdates = (listener) => {
  noteUpdateListeners.add(listener);
  return () => {
    noteUpdateListeners.delete(listener);
  };
};

export const joinNoteRoom = (noteId) => {
  currentNoteId = noteId;
  const token = localStorage.getItem('token');
  if (!socket && token) {
    initializeSocket(token);
  }
  if (socket && socket.connected) {
    socket.emit('join-note', noteId);
  }
};

export const leaveNoteRoom = (noteId) => {
  if (socket && socket.connected && noteId) {
    socket.emit('leave-note', noteId);
  }
  if (String(currentNoteId) === String(noteId)) {
    currentNoteId = null;
  }
  store.dispatch(setActiveRoomUsers([]));
};

export const updateNoteInRealTime = throttle((noteId, content, title, sessionId) => {
  const token = localStorage.getItem('token');
  if (!socket && token) {
    initializeSocket(token);
  }
  if (!socket || !socket.connected) return;

  socket.emit('note-update', {
    noteId,
    content,
    title,
    sessionId,
    timestamp: Date.now()
  });
}, 100);

export const disconnectSocket = () => {
  if (socket) {
    currentNoteId = null;
    socket.disconnect();
    socket = null;
    store.dispatch(setActiveRoomUsers([]));
  }
};
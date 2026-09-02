import { io } from 'socket.io-client';
import { store } from '../store';
import { updateNote, setActiveRoomUsers } from '../store/slices/notesSlice';
import toast from 'react-hot-toast';
import throttle from 'lodash/throttle';

const backendURL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

let socket = null;
let currentNoteId = null;

export const initializeSocket = (token) => {
  if (socket) {
    if (socket.connected) return;
    socket.disconnect();
    socket = null;
  }

  socket = io(backendURL, {
    auth: { token },
    reconnection: true,
    reconnectionDelay: 500,
    reconnectionDelayMax: 3000,
    reconnectionAttempts: 10,
    timeout: 10000,
    forceNew: true,
    transports: ['websocket', 'polling']
  });

  socket.on('connect', () => {
    console.log('Socket connected');
    if (currentNoteId) {
      joinNoteRoom(currentNoteId);
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
  });

  socket.on('room-presence-updated', (data) => {
    if (data.noteId === currentNoteId) {
      store.dispatch(setActiveRoomUsers(data.activeUsers || []));
    }
  });

  socket.on('notification', (data) => {
    toast(data.message, {
      icon: '📝',
      duration: 4000
    });
  });
};

export const joinNoteRoom = (noteId) => {
  if (!socket?.connected) return;
  currentNoteId = noteId;
  socket.emit('join-note', noteId);
};

export const leaveNoteRoom = (noteId) => {
  if (!socket?.connected) return;
  socket.emit('leave-note', noteId);
  currentNoteId = null;
  store.dispatch(setActiveRoomUsers([]));
};

export const updateNoteInRealTime = throttle((noteId, content, title) => {
  if (!socket?.connected) return;
  socket.volatile.emit('note-update', {
    noteId,
    content,
    title,
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
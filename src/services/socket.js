import { io } from 'socket.io-client';
import { store } from '../store';
import { updateNote } from '../store/slices/notesSlice';
import toast from 'react-hot-toast';
import throttle from 'lodash/throttle';

const backendURL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

let socket = null;
let currentNoteId = null;

export const initializeSocket = (token) => {
  if (socket) {
    // If already connected, just return
    if (socket.connected) {
      console.log('Socket already connected');
      return;
    }
    // If disconnected, clean up first
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
    // Rejoin current note room if any
    if (currentNoteId) {
      joinNoteRoom(currentNoteId);
    }
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected');
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
    toast.error('Lost connection to server. Trying to reconnect...');
  });

  socket.on('note-updated', (data) => {
    console.log('Received note update:', data);
    store.dispatch(updateNote(data));
    // Don't show toast here as the notification will come through the notification event
  });

  socket.on('notification', (data) => {
    console.log('Received notification:', data);
    toast(data.message, {
      icon: '📝',
    });
  });
};

export const joinNoteRoom = (noteId) => {
  if (!socket?.connected) {
    console.warn('Socket not connected when trying to join room');
    return;
  }
  currentNoteId = noteId;
  socket.emit('join-note', noteId);
  console.log('Joining note room:', noteId);
};

export const leaveNoteRoom = (noteId) => {
  if (!socket?.connected) {
    console.warn('Socket not connected when trying to leave room');
    return;
  }
  currentNoteId = null;
  socket.emit('leave-note', noteId);
  console.log('Leaving note room:', noteId);
};

export const updateNoteInRealTime = throttle((noteId, content, title) => {
  if (!socket?.connected) {
    console.warn('Socket not connected when trying to update note');
    return;
  }
  
  // Emit the update immediately
  socket.volatile.emit('note-update', { 
    noteId, 
    content, 
    title,
    timestamp: Date.now() // Add timestamp for better sync
  });
  
  console.log('Sending note update:', { noteId, timestamp: Date.now() });
}, 100); // Reduced from 150ms to 100ms for better responsiveness

export const disconnectSocket = () => {
  if (socket) {
    currentNoteId = null;
    socket.disconnect();
    socket = null;
    console.log('Socket disconnected manually');
  }
}; 
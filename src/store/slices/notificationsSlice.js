import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

// Async thunks
export const fetchNotifications = createAsyncThunk(
    'notifications/fetchNotifications',
    async (params = {}) => {
        const response = await api.get('/notifications', { params });
        return response.data;
    }
);

export const markNotificationsAsRead = createAsyncThunk(
    'notifications/markRead',
    async (notificationIds = []) => {
        const response = await api.patch('/notifications/read', { notificationIds });
        return notificationIds;
    }
);

export const clearNotificationsList = createAsyncThunk(
    'notifications/clear',
    async () => {
        await api.delete('/notifications');
        return true;
    }
);

const notificationsSlice = createSlice({
    name: 'notifications',
    initialState: {
        notifications: [],
        loading: false,
        error: null,
        unreadCount: 0
    },
    reducers: {
        addNotification: (state, action) => {
            state.notifications.unshift(action.payload);
            if (!action.payload.read) {
                state.unreadCount += 1;
            }
        },
        clearNotifications: (state) => {
            state.notifications = [];
            state.unreadCount = 0;
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchNotifications.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchNotifications.fulfilled, (state, action) => {
                state.loading = false;
                state.notifications = action.payload.notifications || [];
                state.unreadCount = (action.payload.notifications || []).filter(n => !n.read).length;
            })
            .addCase(fetchNotifications.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message;
            })
            .addCase(markNotificationsAsRead.fulfilled, (state) => {
                state.notifications = state.notifications.map(n => ({ ...n, read: true }));
                state.unreadCount = 0;
            })
            .addCase(clearNotificationsList.fulfilled, (state) => {
                state.notifications = [];
                state.unreadCount = 0;
            });
    }
});

export const { addNotification, clearNotifications } = notificationsSlice.actions;

export default notificationsSlice.reducer;
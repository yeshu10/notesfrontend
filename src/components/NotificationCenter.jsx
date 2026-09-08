import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
    fetchNotifications,
    markNotificationsAsRead,
    clearNotificationsList
} from '../store/slices/notificationsSlice';
import { FaBell, FaCheckDouble, FaTrashAlt } from 'react-icons/fa';

const NotificationCenter = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { notifications, unreadCount, loading } = useSelector((state) => state.notifications);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        dispatch(fetchNotifications());
    }, [dispatch]);

    const handleOpenToggle = () => {
        setIsOpen(!isOpen);
        if (!isOpen && unreadCount > 0) {
            dispatch(markNotificationsAsRead());
        }
    };

    const handleNotificationClick = (noteId) => {
        const targetId = typeof noteId === 'object' ? (noteId?._id || noteId?.id) : noteId;
        if (targetId) {
            navigate(`/notes/${targetId}`);
            setIsOpen(false);
        }
    };

    const handleClearAll = () => {
        dispatch(clearNotificationsList());
    };

    const getNotificationIcon = (type) => {
        switch (type) {
            case 'share':
            case 'NOTE_SHARED':
                return '👥';
            case 'permission_change':
            case 'PERMISSION_CHANGED':
                return '🔑';
            case 'restored':
            case 'NOTE_RESTORED':
                return '🔄';
            case 'NOTE_COMMENT':
                return '💬';
            case 'COMMENT_REPLY':
                return '↩️';
            case 'update':
            case 'NOTE_EDITED':
            default:
                return '📝';
        }
    };

    return (
        <div className="relative">
            <button
                onClick={handleOpenToggle}
                className="relative p-2 text-white hover:bg-white/10 rounded-full transition focus:outline-none cursor-pointer"
                title="Notifications"
            >
                <FaBell size={18} />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-pink-500 text-[10px] font-bold text-white shadow ring-2 ring-indigo-600 animate-pulse">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-30"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="fixed sm:absolute left-3 right-3 sm:left-auto sm:right-0 top-16 sm:top-auto sm:mt-2 sm:w-96 max-w-sm bg-white rounded-2xl shadow-2xl border border-purple-100 z-40 overflow-hidden text-gray-800 animate-in fade-in slide-in-from-top-2 duration-200">
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-purple-100">
                            <div className="flex items-center space-x-2 font-bold text-indigo-900 text-sm">
                                <FaBell className="text-pink-500" />
                                <span>Notifications</span>
                            </div>
                            {notifications.length > 0 && (
                                <button
                                    onClick={handleClearAll}
                                    className="text-xs text-red-500 hover:text-red-700 flex items-center space-x-1 font-semibold p-1 hover:bg-red-50 rounded transition cursor-pointer"
                                >
                                    <FaTrashAlt size={11} />
                                    <span>Clear All</span>
                                </button>
                            )}
                        </div>

                        {/* Notification List */}
                        <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
                            {loading ? (
                                <div className="p-6 text-center text-xs text-gray-400">
                                    Loading notifications...
                                </div>
                            ) : notifications.length === 0 ? (
                                <div className="p-8 text-center text-gray-400">
                                    <p className="text-sm font-medium">No notifications yet</p>
                                    <p className="text-xs mt-1 text-gray-400">Updates on shared notes will show up here.</p>
                                </div>
                            ) : (
                                notifications.map((notif) => (
                                    <div
                                        key={notif._id}
                                        onClick={() => handleNotificationClick(notif.noteId)}
                                        className={`p-3.5 hover:bg-purple-50/60 transition cursor-pointer flex items-start space-x-3 ${!notif.read ? 'bg-indigo-50/40 border-l-4 border-indigo-500' : ''
                                            }`}
                                    >
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 shadow-sm">
                                            {getNotificationIcon(notif.type)}
                                        </div>
                                        <div className="flex-grow min-w-0">
                                            <p className="text-xs text-gray-800 font-medium leading-snug">
                                                {notif.message}
                                            </p>
                                            <p className="text-[10px] text-gray-400 mt-1">
                                                {new Date(notif.createdAt || Date.now()).toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default NotificationCenter;
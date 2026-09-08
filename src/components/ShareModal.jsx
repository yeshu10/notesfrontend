import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { updateNote } from '../store/slices/notesSlice';
import { notesAPI } from '../services/api';
import toast from 'react-hot-toast';
import {
    FaShareAlt,
    FaUserPlus,
    FaUserShield,
    FaTimes,
    FaTrash,
    FaCheck,
    FaEye,
    FaEdit
} from 'react-icons/fa';

const ShareModal = ({ note, onClose }) => {
    const dispatch = useDispatch();
    const [email, setEmail] = useState('');
    const [permission, setPermission] = useState('write'); // 'write' (Editor) or 'read' (Viewer)
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [userSuggestions, setUserSuggestions] = useState([]);
    const [isSearchingUsers, setIsSearchingUsers] = useState(false);
    const [errors, setErrors] = useState({});

    // Auto-suggest user email search
    useEffect(() => {
        if (!email || email.trim().length < 2) {
            setUserSuggestions([]);
            return;
        }

        const timer = setTimeout(async () => {
            setIsSearchingUsers(true);
            try {
                const res = await notesAPI.searchUsers(email);
                setUserSuggestions(res.users || []);
            } catch (err) {
                setUserSuggestions([]);
            } finally {
                setIsSearchingUsers(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [email]);

    const handleShare = async (e) => {
        e.preventDefault();
        if (!email || !email.includes('@')) {
            setErrors({ email: 'Please enter a valid email address' });
            return;
        }

        setIsSubmitting(true);
        setErrors({});

        try {
            const updated = await notesAPI.shareNote(note._id, email.trim(), permission);
            dispatch(updateNote(updated));
            toast.success(`Access granted to ${email}`);
            setEmail('');
            setUserSuggestions([]);
        } catch (error) {
            setErrors({ submit: error.message });
            toast.error(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRemoveCollaborator = async (collabUserId) => {
        if (!window.confirm('Remove access for this collaborator?')) return;
        try {
            const updated = await notesAPI.removeCollaborator(note._id, collabUserId);
            dispatch(updateNote(updated));
            toast.success('Collaborator removed');
        } catch (error) {
            toast.error(error.message || 'Failed to remove collaborator');
        }
    };

    const handleUpdatePermission = async (collabEmail, newPermission) => {
        try {
            const updated = await notesAPI.shareNote(note._id, collabEmail, newPermission);
            dispatch(updateNote(updated));
            toast.success(`Permission updated to ${newPermission === 'write' ? 'Editor' : 'Viewer'}`);
        } catch (error) {
            toast.error(error.message || 'Failed to update permission');
        }
    };

    const selectUserSuggestion = (u) => {
        setEmail(u.email);
        setUserSuggestions([]);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-3 sm:p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full p-4 sm:p-6 shadow-2xl overflow-y-auto max-h-[90vh] animate-in fade-in duration-200">

                {/* Header */}
                <div className="flex items-center justify-between border-b pb-3 mb-4">
                    <div className="flex items-center space-x-2 text-indigo-700 font-extrabold text-base sm:text-lg">
                        <FaShareAlt className="text-pink-500 flex-shrink-0" />
                        <span>Share Note & Manage Roles</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition"
                        aria-label="Close modal"
                    >
                        <FaTimes size={18} />
                    </button>
                </div>

                {/* Note Title context */}
                <div className="mb-4 p-3 bg-purple-50 rounded-xl border border-purple-100 flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-purple-700 uppercase tracking-wider flex-shrink-0">
                        Target Note
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-gray-800 truncate">
                        "{note?.title || 'Untitled Note'}"
                    </span>
                </div>

                {/* Share Form */}
                <form onSubmit={handleShare} className="space-y-4 mb-6">
                    <div className="relative">
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                            Invite Registered User by Email
                        </label>
                        <div className="flex flex-col sm:flex-row gap-2">
                            <div className="relative flex-grow min-w-0">
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="colleague@example.com"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                />

                                {/* Autocomplete Dropdown */}
                                {userSuggestions.length > 0 && (
                                    <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-20 max-h-40 overflow-y-auto">
                                        {userSuggestions.map((u) => (
                                            <div
                                                key={u._id}
                                                onClick={() => selectUserSuggestion(u)}
                                                className="p-2.5 hover:bg-indigo-50 cursor-pointer flex items-center justify-between border-b last:border-0"
                                            >
                                                <div className="min-w-0 mr-2">
                                                    <p className="text-xs font-bold text-gray-800 truncate">{u.name}</p>
                                                    <p className="text-[11px] text-gray-500 truncate">{u.email}</p>
                                                </div>
                                                <FaUserPlus className="text-indigo-500 flex-shrink-0" size={12} />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Permission Level Selector */}
                            <select
                                value={permission}
                                onChange={(e) => setPermission(e.target.value)}
                                className="px-3 py-2 border border-gray-300 rounded-xl text-xs font-semibold text-gray-800 focus:ring-2 focus:ring-indigo-500 bg-gray-50 flex-shrink-0"
                            >
                                <option value="write">Editor (Can edit)</option>
                                <option value="read">Viewer (Can read)</option>
                            </select>
                        </div>
                        {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-2.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 text-white font-bold rounded-xl text-sm hover:brightness-110 shadow transition flex items-center justify-center space-x-2 disabled:opacity-50"
                    >
                        <FaUserPlus />
                        <span>{isSubmitting ? 'Granting Access...' : 'Send Access Invite'}</span>
                    </button>
                </form>

                {/* Current Roles List */}
                <div>
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                        People with Access
                    </h3>
                    <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                        {/* Owner badge */}
                        <div className="flex items-center justify-between p-3 bg-indigo-50/80 rounded-xl border border-indigo-100">
                            <div className="flex items-center space-x-2">
                                <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow">
                                    {note?.createdBy?.name ? note.createdBy.name.charAt(0).toUpperCase() : 'O'}
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-gray-900">{note?.createdBy?.name} (Owner)</p>
                                    <p className="text-[10px] text-gray-500">{note?.createdBy?.email}</p>
                                </div>
                            </div>
                            <span className="px-2.5 py-1 bg-indigo-200 text-indigo-900 rounded-full text-[10px] font-extrabold uppercase">
                                Owner
                            </span>
                        </div>

                        {/* Collaborator badges */}
                        {note?.collaborators?.length === 0 ? (
                            <p className="text-xs text-gray-400 italic text-center py-3 bg-gray-50 rounded-xl">
                                No external collaborators added yet.
                            </p>
                        ) : (
                            note?.collaborators?.map((collab) => {
                                const isWrite = collab.permission === 'write' || collab.permission === 'editor';
                                const collabUser = collab.userId || {};
                                return (
                                    <div
                                        key={collabUser._id || Math.random()}
                                        className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100 hover:bg-gray-100/70 transition gap-2.5"
                                    >
                                        <div className="flex items-center space-x-2 min-w-0 flex-1">
                                            <div className="w-8 h-8 rounded-full bg-purple-500 text-white font-bold text-xs flex items-center justify-center shadow flex-shrink-0">
                                                {collabUser.name ? collabUser.name.charAt(0).toUpperCase() : 'C'}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-xs font-bold text-gray-800 truncate">{collabUser.name || 'Collaborator'}</p>
                                                <p className="text-[10px] text-gray-500 truncate">{collabUser.email}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between sm:justify-end space-x-2 w-full sm:w-auto pt-1 sm:pt-0 border-t sm:border-t-0 border-gray-200/60">
                                            {/* Permission toggle */}
                                            <select
                                                value={isWrite ? 'write' : 'read'}
                                                onChange={(e) => handleUpdatePermission(collabUser.email, e.target.value)}
                                                className="px-2 py-1 border border-gray-300 rounded-lg text-[11px] font-bold bg-white text-gray-700"
                                            >
                                                <option value="write">Editor</option>
                                                <option value="read">Viewer</option>
                                            </select>

                                            {/* Remove button */}
                                            <button
                                                onClick={() => handleRemoveCollaborator(collabUser._id)}
                                                className="text-gray-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition"
                                                title="Remove Access"
                                                aria-label="Remove Access"
                                            >
                                                <FaTrash size={12} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-6 pt-3 border-t flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-5 py-2 text-xs font-bold bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition"
                    >
                        Close
                    </button>
                </div>

            </div>
        </div>
    );
};

export default ShareModal;
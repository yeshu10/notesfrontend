import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setActiveFilter, setSelectedTag } from '../store/slices/notesSlice';
import { notesAPI } from '../services/api';
import toast from 'react-hot-toast';
import {
    FaStickyNote,
    FaUser,
    FaUserFriends,
    FaThumbtack,
    FaStar,
    FaArchive,
    FaTrash,
    FaTag,
    FaPlus,
    FaTimes,
    FaBroom
} from 'react-icons/fa';
import TagManagerModal from './TagManagerModal';

const NAV_ITEMS = [
    { id: 'all', label: 'All Notes', icon: FaStickyNote },
    { id: 'mine', label: 'My Notes', icon: FaUser },
    { id: 'shared', label: 'Shared With Me', icon: FaUserFriends },
    { id: 'pinned', label: 'Pinned Notes', icon: FaThumbtack },
    { id: 'favorites', label: 'Favorites', icon: FaStar },
    { id: 'archived', label: 'Archived', icon: FaArchive },
    { id: 'trash', label: 'Trash', icon: FaTrash },
];

const Sidebar = ({ mobileOpen, setMobileOpen, onRefreshNotes }) => {
    const dispatch = useDispatch();
    const { activeFilter, selectedTag, tags, notes } = useSelector((state) => state.notes);
    const [isTagModalOpen, setIsTagModalOpen] = useState(false);
    const [isEmptyingTrash, setIsEmptyingTrash] = useState(false);

    const handleFilterClick = (filterId) => {
        dispatch(setActiveFilter(filterId));
        if (setMobileOpen) setMobileOpen(false);
    };

    const handleTagClick = (tagName) => {
        if (selectedTag === tagName) {
            dispatch(setSelectedTag(''));
        } else {
            dispatch(setSelectedTag(tagName));
        }
        if (setMobileOpen) setMobileOpen(false);
    };

    const handleEmptyTrash = async () => {
        if (!window.confirm('Are you sure you want to permanently delete all notes in Trash? This action cannot be undone.')) {
            return;
        }

        setIsEmptyingTrash(true);
        try {
            const res = await notesAPI.emptyTrash();
            toast.success(res.message || 'Trash emptied');
            if (onRefreshNotes) onRefreshNotes();
        } catch (error) {
            toast.error(error.message || 'Failed to empty trash');
        } finally {
            setIsEmptyingTrash(false);
        }
    };

    const content = (
        <div className="h-full flex flex-col justify-between p-4 bg-white/95 backdrop-blur-md border-r border-purple-100 w-64 shadow-sm">
            <div className="space-y-6 overflow-y-auto">
                {/* Navigation Categories */}
                <div>
                    <p className="px-3 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                        Navigation
                    </p>
                    <nav className="space-y-1">
                        {NAV_ITEMS.map((item) => {
                            const Icon = item.icon;
                            const isActive = activeFilter === item.id && !selectedTag;
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => handleFilterClick(item.id)}
                                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition duration-200 ${isActive
                                            ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-md'
                                            : 'text-gray-700 hover:bg-purple-50 hover:text-purple-700'
                                        }`}
                                >
                                    <div className="flex items-center space-x-3">
                                        <Icon className={isActive ? 'text-white' : 'text-purple-500'} />
                                        <span>{item.label}</span>
                                    </div>
                                </button>
                            );
                        })}
                    </nav>
                </div>

                {/* Tags Section */}
                <div>
                    <div className="flex items-center justify-between px-3 mb-2">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                            Tags
                        </p>
                        <button
                            onClick={() => setIsTagModalOpen(true)}
                            className="text-xs font-semibold text-purple-600 hover:text-purple-800 flex items-center space-x-1 p-1 hover:bg-purple-50 rounded transition"
                            title="Manage tags"
                        >
                            <FaPlus size={10} />
                            <span>Manage</span>
                        </button>
                    </div>

                    {tags.length === 0 ? (
                        <div className="px-3 py-3 text-xs text-gray-400 italic bg-purple-50/50 rounded-xl">
                            No tags yet.{' '}
                            <button
                                onClick={() => setIsTagModalOpen(true)}
                                className="text-purple-600 underline font-medium"
                            >
                                Add one
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                            {tags.map((tag) => {
                                const isTagActive = selectedTag === tag;
                                return (
                                    <button
                                        key={tag}
                                        onClick={() => handleTagClick(tag)}
                                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition ${isTagActive
                                                ? 'bg-purple-100 text-purple-800 font-bold border border-purple-300'
                                                : 'text-gray-600 hover:bg-purple-50 hover:text-purple-700'
                                            }`}
                                    >
                                        <div className="flex items-center space-x-2 truncate">
                                            <FaTag className={isTagActive ? 'text-purple-600' : 'text-pink-400'} size={11} />
                                            <span className="truncate">{tag}</span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Footer / Empty Trash Option */}
            {activeFilter === 'trash' && (
                <div className="pt-4 border-t border-gray-100">
                    <button
                        onClick={handleEmptyTrash}
                        disabled={isEmptyingTrash}
                        className="w-full flex items-center justify-center space-x-2 px-3 py-2.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl text-xs font-bold transition disabled:opacity-50"
                    >
                        <FaBroom />
                        <span>{isEmptyingTrash ? 'Emptying...' : 'Empty Trash Now'}</span>
                    </button>
                </div>
            )}

            {/* Tag Manager Modal */}
            <TagManagerModal
                isOpen={isTagModalOpen}
                onClose={() => setIsTagModalOpen(false)}
            />
        </div>
    );

    return (
        <>
            {/* Desktop Permanent Sidebar */}
            <aside className="hidden lg:block h-[calc(100vh-4rem)] sticky top-16 z-20">
                {content}
            </aside>

            {/* Mobile Drawer */}
            {mobileOpen && (
                <div className="fixed inset-0 z-50 lg:hidden">
                    <div
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
                        onClick={() => setMobileOpen(false)}
                    />
                    <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-2xl z-50 flex flex-col">
                        <div className="p-4 border-b flex justify-between items-center bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 text-white">
                            <h2 className="font-bold text-lg">Menu</h2>
                            <button
                                onClick={() => setMobileOpen(false)}
                                className="p-1 rounded hover:bg-white/20 text-white"
                            >
                                <FaTimes size={18} />
                            </button>
                        </div>
                        <div className="flex-grow overflow-y-auto">{content}</div>
                    </div>
                </div>
            )}
        </>
    );
};

export default Sidebar;

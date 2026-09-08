import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { updateNote, removeNote, setSelectedTag } from '../store/slices/notesSlice';
import { notesAPI } from '../services/api';
import { remindersAPI } from '../services/api';
import toast from 'react-hot-toast';
import {
    FaThumbtack,
    FaStar,
    FaArchive,
    FaTrash,
    FaUndo,
    FaShareAlt,
    FaTag,
    FaUserFriends,
    FaPencilAlt,
    FaEye,
    FaEdit,
    FaClock,
    FaRegCommentDots,
    FaListUl
} from 'react-icons/fa';

const NoteCard = ({ note, onShareClick }) => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { user } = useSelector((state) => state.auth);

    const [reminder, setReminder] = useState(null);

    useEffect(() => {
        let isMounted = true;
        if (note?._id) {
            remindersAPI.getNoteReminder(note._id).then((data) => {
                if (isMounted && data && data.isActive && !data.isTriggered) {
                    setReminder(data);
                } else if (isMounted) {
                    setReminder(null);
                }
            }).catch(() => { });
        }
        return () => { isMounted = false; };
    }, [note._id]);

    const isOwner = note.isOwnedByCurrentUser || (note.createdBy && (note.createdBy._id === user?.id || note.createdBy._id === user?._id));
    const userPermission = note.userPermission || (isOwner ? 'owner' : 'editor');

    const handleTogglePin = async (e) => {
        e.stopPropagation();
        try {
            const updated = await notesAPI.updateNote(note._id, { isPinned: !note.isPinned });
            dispatch(updateNote(updated));
            toast.success(updated.isPinned ? 'Note pinned to top' : 'Note unpinned');
        } catch (error) {
            toast.error(error.message || 'Failed to update pin state');
        }
    };

    const handleToggleFavorite = async (e) => {
        e.stopPropagation();
        try {
            const updated = await notesAPI.updateNote(note._id, { isFavorite: !note.isFavorite });
            dispatch(updateNote(updated));
        } catch (error) {
            toast.error(error.message || 'Failed to update favorite state');
        }
    };

    const handleToggleArchive = async (e) => {
        e.stopPropagation();
        try {
            let updated;
            if (note.isArchived) {
                updated = await notesAPI.unarchiveNote(note._id);
            } else {
                updated = await notesAPI.archiveNote(note._id);
            }
            dispatch(updateNote(updated));
            toast.success(updated.isArchived ? 'Note archived' : 'Note unarchived');
        } catch (error) {
            toast.error(error.message || 'Failed to update archive state');
        }
    };

    const handleDeleteOrTrash = async (e) => {
        e.stopPropagation();
        if (note.isTrashed) {
            if (!window.confirm('Permanently delete this note? This action cannot be undone.')) {
                return;
            }
        }
        try {
            const res = await notesAPI.deleteNote(note._id);
            if (res.softDeleted) {
                dispatch(removeNote(note._id));
                toast.success('Note moved to trash');
            } else {
                dispatch(removeNote(note._id));
                toast.success('Note permanently deleted');
            }
        } catch (error) {
            toast.error(error.message || 'Failed to delete note');
        }
    };

    const handleRestore = async (e) => {
        e.stopPropagation();
        try {
            const restored = await notesAPI.restoreNote(note._id);
            dispatch(updateNote(restored));
            toast.success('Note restored!');
        } catch (error) {
            toast.error(error.message || 'Failed to restore note');
        }
    };

    const handleTagClick = (e, tag) => {
        e.stopPropagation();
        dispatch(setSelectedTag(tag));
    };

    return (
        <div
            onClick={() => navigate(`/notes/${note._id}`)}
            className={`group relative flex flex-col justify-between p-4 sm:p-5 bg-white rounded-2xl border transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer overflow-hidden ${note.isPinned ? 'border-purple-300 ring-2 ring-purple-100 shadow-md' : 'border-gray-100 shadow-sm hover:border-purple-200'
                }`}
        >
            {/* Top Accent Line */}
            <div className={`absolute top-0 left-0 right-0 h-1.5 ${note.isTrashed
                ? 'bg-gradient-to-r from-red-400 to-rose-500'
                : note.isArchived
                    ? 'bg-gradient-to-r from-amber-400 to-purple-500'
                    : note.isPinned
                        ? 'bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500'
                        : 'bg-gradient-to-r from-gray-200 to-purple-200 group-hover:from-indigo-400 group-hover:to-pink-400'
                }`} />

            <div>
                {/* Card Header: Role Badge, Status Badges, Pin & Favorite */}
                <div className="flex items-center justify-between mb-3 pt-1 gap-1.5">
                    <div className="flex items-center space-x-1.5 flex-wrap">
                        {/* Permission / Role pill */}
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide flex items-center space-x-1 ${isOwner
                            ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                            : userPermission === 'editor'
                                ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                : 'bg-gray-100 text-gray-700 border border-gray-200'
                            }`}>
                            {isOwner ? <FaPencilAlt size={8} /> : userPermission === 'editor' ? <FaEdit size={8} /> : <FaEye size={8} />}
                            <span>{isOwner ? 'Owner' : userPermission === 'editor' ? 'Editor' : 'Viewer'}</span>
                        </span>

                        {note.isArchived && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-50 text-amber-700 border border-amber-200">
                                Archived
                            </span>
                        )}
                        {note.isTrashed && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-red-50 text-red-700 border border-red-200">
                                Trash
                            </span>
                        )}
                    </div>

                    {/* Quick Actions (Pin & Favorite) - only for active / non-trashed notes */}
                    {!note.isTrashed && (
                        <div className="flex items-center space-x-0.5 flex-shrink-0">
                            <button
                                onClick={handleToggleFavorite}
                                className={`p-1.5 rounded-full transition min-w-[28px] min-h-[28px] flex items-center justify-center ${note.isFavorite ? 'text-amber-400 hover:text-amber-500' : 'text-gray-300 hover:text-amber-400'
                                    }`}
                                title={note.isFavorite ? 'Favorite' : 'Add to Favorites'}
                                aria-label={note.isFavorite ? 'Favorite' : 'Add to Favorites'}
                            >
                                <FaStar size={13} />
                            </button>

                            <button
                                onClick={handleTogglePin}
                                className={`p-1.5 rounded-full transition min-w-[28px] min-h-[28px] flex items-center justify-center ${note.isPinned ? 'text-purple-600 bg-purple-50' : 'text-gray-300 hover:text-purple-600'
                                    }`}
                                title={note.isPinned ? 'Unpin Note' : 'Pin Note'}
                                aria-label={note.isPinned ? 'Unpin Note' : 'Pin Note'}
                            >
                                <FaThumbtack size={12} className={note.isPinned ? 'transform rotate-45' : ''} />
                            </button>
                        </div>
                    )}
                </div>

                {/* Active Reminder Pill */}
                {reminder && (
                    <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-amber-50 text-amber-800 text-[11px] font-bold rounded-lg border border-amber-200/80 mb-2.5 w-fit shadow-xs">
                        <FaClock size={11} className="text-amber-600 flex-shrink-0" />
                        <span className="truncate">{new Date(reminder.reminderAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
                    </div>
                )}

                {/* Note Title */}
                <h3 className="text-base font-bold text-gray-800 line-clamp-1 mb-1.5 group-hover:text-purple-700 transition">
                    {note.title || 'Untitled Note'}
                </h3>

                {/* Note Content Preview — text or checklist */}
                {note.type === 'checklist' && Array.isArray(note.checklistItems) && note.checklistItems.length > 0 ? (
                    <div className="mb-4 space-y-1">
                        {note.checklistItems.slice(0, 3).map((item, idx) => (
                            <div key={item.id || idx} className="flex items-center space-x-1.5 text-xs text-gray-600">
                                <span className={item.completed ? 'text-green-500 flex-shrink-0' : 'text-gray-400 flex-shrink-0'}>
                                    {item.completed ? '☑' : '☐'}
                                </span>
                                <span className={`line-clamp-1 ${item.completed ? 'line-through text-gray-400' : ''}`}>
                                    {item.text || '(empty item)'}
                                </span>
                            </div>
                        ))}
                        {note.checklistItems.length > 3 && (
                            <span className="text-[10px] text-gray-400 font-medium">+{note.checklistItems.length - 3} more items</span>
                        )}
                    </div>
                ) : (
                    <p className="text-xs text-gray-600 line-clamp-3 mb-4 leading-relaxed font-normal">
                        {note.content ? note.content.replace(/[#*`]/g, '') : 'No additional text in note...'}
                    </p>
                )}

                {/* Checklist type indicator pill */}
                {note.type === 'checklist' && (
                    <div className="flex items-center space-x-1 mb-3">
                        <span className="flex items-center space-x-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-md border border-emerald-100">
                            <FaListUl size={8} />
                            <span>
                                {Array.isArray(note.checklistItems)
                                    ? `${note.checklistItems.filter(i => i.completed).length}/${note.checklistItems.length} done`
                                    : 'Checklist'}
                            </span>
                        </span>
                    </div>
                )}

                {/* Tags badges */}
                {note.tags && note.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                        {note.tags.map((tag) => (
                            <button
                                key={tag}
                                onClick={(e) => handleTagClick(e, tag)}
                                className="px-2 py-0.5 bg-purple-50 hover:bg-purple-100 text-purple-700 text-[10px] font-semibold rounded-md border border-purple-100 transition flex items-center space-x-1"
                            >
                                <FaTag size={8} />
                                <span>{tag}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Footer Info & Action Bar */}
            <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-gray-400 text-[11px] gap-2 flex-wrap">
                {/* Date, Collaborators count & Comment count */}
                <div className="flex items-center space-x-2 min-w-0">
                    <span className="truncate">{new Date(note.lastUpdated || note.updatedAt || Date.now()).toLocaleDateString()}</span>
                    {note.collaborators && note.collaborators.length > 0 && (
                        <span className="flex items-center space-x-1 text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded text-[10px] font-bold flex-shrink-0">
                            <FaUserFriends size={10} />
                            <span>+{note.collaborators.length}</span>
                        </span>
                    )}
                    {note.commentCount > 0 && (
                        <span className="flex items-center space-x-1 text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded text-[10px] font-bold flex-shrink-0">
                            <FaRegCommentDots size={10} />
                            <span>{note.commentCount}</span>
                        </span>
                    )}
                </div>

                {/* Card Action Menu */}
                <div className="flex items-center space-x-1 opacity-90 group-hover:opacity-100 transition flex-shrink-0">
                    {/* Trashed actions */}
                    {note.isTrashed ? (
                        <>
                            <button
                                onClick={handleRestore}
                                className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition min-w-[28px] min-h-[28px] flex items-center justify-center"
                                title="Restore note"
                                aria-label="Restore note"
                            >
                                <FaUndo size={12} />
                            </button>
                            <button
                                onClick={handleDeleteOrTrash}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition min-w-[28px] min-h-[28px] flex items-center justify-center"
                                title="Permanently delete"
                                aria-label="Permanently delete"
                            >
                                <FaTrash size={12} />
                            </button>
                        </>
                    ) : (
                        <>
                            {/* Share (if owner) */}
                            {isOwner && onShareClick && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onShareClick(note);
                                    }}
                                    className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition min-w-[28px] min-h-[28px] flex items-center justify-center"
                                    title="Share note"
                                    aria-label="Share note"
                                >
                                    <FaShareAlt size={12} />
                                </button>
                            )}

                            {/* Archive */}
                            <button
                                onClick={handleToggleArchive}
                                className={`p-1.5 rounded-lg transition min-w-[28px] min-h-[28px] flex items-center justify-center ${note.isArchived
                                    ? 'text-purple-600 bg-purple-50 hover:bg-purple-100'
                                    : 'text-gray-400 hover:text-purple-600 hover:bg-purple-50'
                                    }`}
                                title={note.isArchived ? 'Unarchive' : 'Archive'}
                                aria-label={note.isArchived ? 'Unarchive' : 'Archive'}
                            >
                                <FaArchive size={12} />
                            </button>

                            {/* Delete / Move to Trash */}
                            {isOwner && (
                                <button
                                    onClick={handleDeleteOrTrash}
                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition min-w-[28px] min-h-[28px] flex items-center justify-center"
                                    title="Move to Trash"
                                    aria-label="Move to Trash"
                                >
                                    <FaTrash size={12} />
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default NoteCard;

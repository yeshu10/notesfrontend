import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  setCurrentNote,
  updateNote,
  setActiveRoomUsers
} from '../store/slices/notesSlice';
import { notesAPI } from '../services/api';
import {
  joinNoteRoom,
  leaveNoteRoom,
  updateNoteInRealTime,
  subscribeToNoteUpdates
} from '../services/socket';
import ShareModal from '../components/ShareModal';
import VersionHistoryModal from '../components/VersionHistoryModal';
import toast from 'react-hot-toast';
import debounce from 'lodash/debounce';
import {
  FaArrowLeft,
  FaShareAlt,
  FaThumbtack,
  FaTag,
  FaPlus,
  FaTimes,
  FaBold,
  FaItalic,
  FaHeading,
  FaQuoteLeft,
  FaListUl,
  FaListOl,
  FaCode,
  FaEye,
  FaEdit,
  FaColumns,
  FaCheck,
  FaSync,
  FaLock,
  FaSave,
  FaHistory,
  FaClock,
  FaArchive,
  FaTrash,
  FaUndo,
  FaComments
} from 'react-icons/fa';
import { remindersAPI } from '../services/api';
import ReminderModal from '../components/ReminderModal';
import CommentsSection from '../components/CommentsSection';
import AttachmentsSection from '../components/AttachmentsSection';

const NoteEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { user } = useSelector((state) => state.auth);
  const { currentNote, activeRoomUsers, tags } = useSelector((state) => state.notes);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [noteTags, setNoteTags] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState(null);
  const [viewMode, setViewMode] = useState('edit'); // 'edit', 'split', 'preview'
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [reminder, setReminder] = useState(null);
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const [commentCount, setCommentCount] = useState(0);
  const commentsSectionRef = useRef(null);

  const scrollToComments = () => {
    if (commentsSectionRef.current) {
      commentsSectionRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleVersionRestored = (restoredNote) => {
    if (!restoredNote) return;
    setTitle(restoredNote.title || '');
    setContent(restoredNote.content || '');
    if (restoredNote.tags) setNoteTags(restoredNote.tags);
    dispatch(setCurrentNote(restoredNote));
    dispatch(updateNote(restoredNote));
    setLastSavedTime(new Date());
    if (id) {
      updateNoteInRealTime(id, restoredNote.content, restoredNote.title);
    }
  };

  const textareaRef = useRef(null);
  const isMountedRef = useRef(true);
  const isLoadedRef = useRef(false);
  const sessionIdRef = useRef(`session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`);

  // Load note details
  useEffect(() => {
    isMountedRef.current = true;
    isLoadedRef.current = false;
    const fetchNote = async () => {
      try {
        const data = await notesAPI.getNote(id);
        if (isMountedRef.current) {
          dispatch(setCurrentNote(data));
          setTitle(data.title || '');
          setContent(data.content || '');
          setNoteTags(data.tags || []);
          joinNoteRoom(id);
          // Mark loaded after state is populated
          setTimeout(() => {
            isLoadedRef.current = true;
          }, 100);
        }
      } catch (error) {
        toast.error(error.message || 'Failed to load note');
        navigate('/');
      }
    };

    fetchNote();

    if (id) {
      remindersAPI.getNoteReminder(id).then((r) => {
        if (r && r.isActive && !r.isTriggered) {
          setReminder(r);
        } else {
          setReminder(null);
        }
      }).catch(() => { });
    }

    return () => {
      isMountedRef.current = false;
      leaveNoteRoom(id);
    };
  }, [id, dispatch, navigate]);

  // Determine user permission & status
  const isOwner = currentNote?.isOwnedByCurrentUser || (currentNote?.createdBy && (currentNote.createdBy._id === user?.id || currentNote.createdBy._id === user?._id));
  const userPermission = currentNote?.userPermission || (isOwner ? 'owner' : 'editor');
  const isTrashed = !!currentNote?.isTrashed;
  const isArchived = !!currentNote?.isArchived;
  const canEdit = !isTrashed && (isOwner || userPermission === 'editor' || userPermission === 'write');

  const currentUserId = user?.id || user?._id;

  // Real-time synchronization for incoming WebSocket edits from other collaborators
  useEffect(() => {
    if (!id) return;

    const unsubscribe = subscribeToNoteUpdates((data) => {
      if (String(data._id) === String(id)) {
        const editorUserId = data.updatedBy?.id;
        const isFromOtherUser = editorUserId && String(editorUserId) !== String(currentUserId);

        if (isFromOtherUser) {
          if (data.title !== undefined) {
            setTitle(data.title);
          }
          if (data.content !== undefined) {
            const textarea = textareaRef.current;
            const start = textarea ? textarea.selectionStart : null;
            const end = textarea ? textarea.selectionEnd : null;

            setContent(data.content);

            if (textarea && start !== null && end !== null && document.activeElement === textarea) {
              setTimeout(() => {
                try {
                  textarea.setSelectionRange(start, end);
                } catch (e) { }
              }, 0);
            }
          }
          if (data.tags !== undefined) {
            setNoteTags(data.tags);
          }
          setLastSavedTime(new Date());
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [id, currentUserId]);

  // Immediate save helper for explicit save / navigation
  const saveNoteNow = async (updatedTitle, updatedContent, updatedTags) => {
    if (!canEdit || !id) return;
    setIsSaving(true);
    try {
      const result = await notesAPI.updateNote(id, {
        title: (updatedTitle !== undefined ? updatedTitle : title).trim() || 'Untitled Note',
        content: updatedContent !== undefined ? updatedContent : content,
        tags: updatedTags !== undefined ? updatedTags : noteTags,
        sessionId: sessionIdRef.current
      });
      dispatch(updateNote(result));
      setLastSavedTime(new Date());
      return result;
    } catch (error) {
      console.error('Save note error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Debounced auto-save via useEffect
  useEffect(() => {
    if (!isLoadedRef.current || !canEdit || !id) return;

    setIsSaving(true);
    const timer = setTimeout(async () => {
      try {
        const result = await notesAPI.updateNote(id, {
          title: title.trim() || 'Untitled Note',
          content,
          tags: noteTags,
          sessionId: sessionIdRef.current
        });
        dispatch(updateNote(result));
        setLastSavedTime(new Date());
      } catch (error) {
        console.error('Auto-save error:', error);
      } finally {
        setIsSaving(false);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [title, content, noteTags, id, canEdit, dispatch]);

  // Save on navigation back
  const handleBack = async () => {
    if (canEdit && id) {
      await saveNoteNow();
    }
    navigate('/');
  };

  // Keyboard shortcut Ctrl+S / Cmd+S for saving
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (canEdit && id) {
          saveNoteNow();
          toast.success('Note saved!');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [id, canEdit, title, content, noteTags]);

  // Handle title change
  const handleTitleChange = (e) => {
    const val = e.target.value;
    setTitle(val);
    if (canEdit && id) {
      updateNoteInRealTime(id, content, val, sessionIdRef.current);
    }
  };

  // Handle content change
  const handleContentChange = (e) => {
    const val = e.target.value;
    setContent(val);
    if (canEdit && id) {
      updateNoteInRealTime(id, val, title, sessionIdRef.current);
    }
  };

  // Tag addition
  const handleAddTagToNote = (tagToAdd) => {
    const trimmed = tagToAdd.trim();
    if (!trimmed || noteTags.includes(trimmed)) return;
    const updated = [...noteTags, trimmed];
    setNoteTags(updated);
    setNewTagInput('');
    setShowTagDropdown(false);
  };

  const handleRemoveTagFromNote = (tagToRemove) => {
    const updated = noteTags.filter(t => t !== tagToRemove);
    setNoteTags(updated);
  };

  // Toggle Pin
  const handleTogglePin = async () => {
    if (!currentNote) return;
    try {
      const res = await notesAPI.updateNote(currentNote._id, { isPinned: !currentNote.isPinned });
      dispatch(updateNote(res));
      toast.success(res.isPinned ? 'Note pinned' : 'Note unpinned');
    } catch (error) {
      toast.error('Failed to update pin');
    }
  };

  // Toggle Archive
  const handleToggleArchive = async () => {
    if (!currentNote) return;
    try {
      let updated;
      if (currentNote.isArchived) {
        updated = await notesAPI.unarchiveNote(currentNote._id);
      } else {
        updated = await notesAPI.archiveNote(currentNote._id);
      }
      dispatch(setCurrentNote(updated));
      dispatch(updateNote(updated));
      toast.success(updated.isArchived ? 'Note archived' : 'Note unarchived');
    } catch (error) {
      toast.error(error.message || 'Failed to update archive state');
    }
  };

  // Move to Trash
  const handleMoveToTrash = async () => {
    if (!currentNote) return;
    try {
      const res = await notesAPI.deleteNote(currentNote._id);
      if (res.note) {
        dispatch(setCurrentNote(res.note));
        dispatch(updateNote(res.note));
      }
      toast.success('Note moved to trash');
      navigate('/');
    } catch (error) {
      toast.error(error.message || 'Failed to move note to trash');
    }
  };

  // Restore Note from Trash
  const handleRestoreNote = async () => {
    if (!currentNote) return;
    try {
      const restored = await notesAPI.restoreNote(currentNote._id);
      dispatch(setCurrentNote(restored));
      dispatch(updateNote(restored));
      toast.success('Note restored!');
    } catch (error) {
      toast.error(error.message || 'Failed to restore note');
    }
  };

  // Permanently Delete
  const handlePermanentDelete = async () => {
    if (!currentNote) return;
    if (!window.confirm('Permanently delete this note? This action cannot be undone.')) {
      return;
    }
    try {
      await notesAPI.deleteNote(currentNote._id);
      toast.success('Note permanently deleted');
      navigate('/');
    } catch (error) {
      toast.error(error.message || 'Failed to delete note');
    }
  };

  // Markdown Formatting Helpers
  const insertFormatting = (prefix, suffix = '') => {
    if (!textareaRef.current || !canEdit) return;
    const el = textareaRef.current;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const text = el.value;
    const selectedText = text.substring(start, end);
    const replacement = `${prefix}${selectedText}${suffix}`;

    const newContent = text.substring(0, start) + replacement + text.substring(end);
    setContent(newContent);

    if (id) {
      updateNoteInRealTime(id, newContent, title);
    }

    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + prefix.length, end + prefix.length);
    }, 10);
  };

  // Word count & Char count
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const charCount = content.length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">

      {/* Top Header Bar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between gap-2 sm:gap-4">

          {/* Left section: Back button & Title */}
          <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
            <button
              onClick={handleBack}
              className="p-1.5 sm:p-2 text-gray-500 hover:text-purple-700 hover:bg-purple-50 rounded-xl transition flex-shrink-0"
              title="Back to Dashboard"
              aria-label="Back to Dashboard"
            >
              <FaArrowLeft size={16} />
            </button>

            <div className="flex-1 min-w-0">
              <input
                type="text"
                value={title}
                onChange={handleTitleChange}
                disabled={!canEdit}
                placeholder="Untitled Note..."
                className="w-full text-base sm:text-xl font-black text-gray-900 bg-transparent border-b border-transparent focus:border-purple-500 focus:outline-none transition py-0.5 truncate"
              />
            </div>
          </div>

          {/* Right section: Desktop Actions & Mobile Quick Actions */}
          <div className="flex items-center space-x-1.5 sm:space-x-2 flex-shrink-0">

            {/* Real-time Room Active Presence Avatars */}
            {activeRoomUsers.length > 0 && (
              <div className="hidden sm:flex items-center -space-x-2 mr-2" title="Collaborators currently viewing this note">
                {activeRoomUsers.map((u) => (
                  <div
                    key={u.userId || u.socketId}
                    className="w-7 h-7 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white shadow-sm"
                    title={`${u.name} (Active in room)`}
                  >
                    {u.name ? u.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                ))}
              </div>
            )}

            {/* Save status pill (Desktop) */}
            <div className="hidden md:flex items-center space-x-1.5 text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full font-medium">
              {isSaving ? (
                <>
                  <FaSync className="animate-spin text-purple-600" size={10} />
                  <span>Saving...</span>
                </>
              ) : !canEdit ? (
                <>
                  <FaLock className="text-amber-500" size={10} />
                  <span>Read Only</span>
                </>
              ) : (
                <>
                  <FaCheck className="text-green-500" size={10} />
                  <span>Saved</span>
                </>
              )}
            </div>

            {/* Role Badge (Desktop) */}
            <span className={`hidden md:inline-flex px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${isOwner
              ? 'bg-indigo-100 text-indigo-900 border border-indigo-200'
              : canEdit
                ? 'bg-purple-100 text-purple-900 border border-purple-200'
                : 'bg-amber-100 text-amber-900 border border-amber-200'
              }`}>
              {isOwner ? 'Owner' : canEdit ? 'Editor' : 'Viewer'}
            </span>

            {/* Pin Toggle (Desktop) */}
            {!isTrashed && (
              <button
                onClick={handleTogglePin}
                className={`hidden md:flex p-2 rounded-xl transition ${currentNote?.isPinned ? 'bg-purple-100 text-purple-700' : 'text-gray-400 hover:bg-gray-100'
                  }`}
                title={currentNote?.isPinned ? 'Unpin note' : 'Pin note'}
              >
                <FaThumbtack size={14} />
              </button>
            )}

            {/* Archive Toggle Button (Desktop) */}
            {!isTrashed && (
              <button
                onClick={handleToggleArchive}
                className={`hidden md:flex p-2 rounded-xl transition ${isArchived ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'text-gray-400 hover:bg-gray-100'}`}
                title={isArchived ? 'Unarchive note' : 'Archive note'}
              >
                <FaArchive size={14} />
              </button>
            )}

            {/* Move to Trash Button (Desktop) */}
            {isOwner && !isTrashed && (
              <button
                onClick={handleMoveToTrash}
                className="hidden md:flex p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition"
                title="Move to Trash"
              >
                <FaTrash size={14} />
              </button>
            )}

            {/* Version History Button (Desktop) */}
            <button
              onClick={() => setIsHistoryModalOpen(true)}
              className="hidden md:flex p-2 text-gray-600 hover:text-purple-700 hover:bg-purple-50 rounded-xl transition items-center space-x-1.5"
              title="Version History"
            >
              <FaHistory size={14} />
              <span className="hidden lg:inline text-xs font-bold">History</span>
            </button>

            {/* Comments Quick Access Button (Desktop) */}
            <button
              onClick={scrollToComments}
              className="hidden md:flex px-2.5 py-1.5 rounded-xl text-xs font-bold text-gray-600 hover:text-purple-700 hover:bg-purple-50 transition items-center space-x-1.5"
              title="Comments & Discussion"
            >
              <FaComments size={14} className="text-purple-600" />
              <span className="hidden sm:inline">Comments</span>
              {commentCount > 0 && (
                <span className="px-1.5 py-0.5 bg-purple-100 text-purple-800 rounded-full text-[10px] font-extrabold">
                  {commentCount}
                </span>
              )}
            </button>

            {/* Reminder Button (Desktop) */}
            {canEdit && (
              <button
                onClick={() => setIsReminderModalOpen(true)}
                className={`hidden md:flex px-3 py-1.5 rounded-xl text-xs font-bold transition items-center space-x-1.5 ${reminder
                  ? 'bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200'
                  : 'text-gray-600 hover:text-purple-700 hover:bg-purple-50'
                  }`}
                title={reminder ? `Reminder: ${new Date(reminder.reminderAt).toLocaleString()}` : 'Set Reminder'}
              >
                <FaClock size={13} className={reminder ? 'text-amber-600 animate-pulse' : 'text-purple-600'} />
                <span className="hidden sm:inline">
                  {reminder
                    ? new Date(reminder.reminderAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : 'Reminder'}
                </span>
              </button>
            )}

            {/* Manual Save Button */}
            {canEdit && (
              <button
                onClick={async () => {
                  await saveNoteNow();
                  toast.success('Note saved!');
                }}
                disabled={isSaving}
                className="px-2.5 sm:px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow transition flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                title="Save changes (Ctrl+S)"
              >
                <FaSave size={12} />
                <span className="hidden sm:inline">Save</span>
              </button>
            )}

            {/* Share Button (Only if owner) */}
            {isOwner && !isTrashed && (
              <button
                onClick={() => setIsShareModalOpen(true)}
                className="px-2.5 sm:px-3.5 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl text-xs hover:brightness-110 shadow transition flex items-center space-x-1.5"
                title="Share note"
              >
                <FaShareAlt size={12} />
                <span className="hidden sm:inline">Share</span>
              </button>
            )}

          </div>
        </div>

        {/* Mobile Action Strip (visible only on <md) */}
        <div className="md:hidden bg-slate-50 border-t border-gray-100 px-3 py-1.5 flex items-center justify-between gap-1 overflow-x-auto">
          <div className="flex items-center space-x-1.5 flex-shrink-0">
            {/* Role Badge */}
            <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider ${isOwner
              ? 'bg-indigo-100 text-indigo-900 border border-indigo-200'
              : canEdit
                ? 'bg-purple-100 text-purple-900 border border-purple-200'
                : 'bg-amber-100 text-amber-900 border border-amber-200'
              }`}>
              {isOwner ? 'Owner' : canEdit ? 'Editor' : 'Viewer'}
            </span>

            {/* Save Status indicator */}
            <span className="text-[10px] text-gray-500 flex items-center space-x-1">
              {isSaving ? (
                <FaSync className="animate-spin text-purple-600" size={9} />
              ) : !canEdit ? (
                <FaLock className="text-amber-500" size={9} />
              ) : (
                <FaCheck className="text-green-500" size={9} />
              )}
            </span>
          </div>

          <div className="flex items-center space-x-1 flex-shrink-0">
            {/* Pin Toggle */}
            {!isTrashed && (
              <button
                onClick={handleTogglePin}
                className={`p-1.5 rounded-lg transition ${currentNote?.isPinned ? 'bg-purple-100 text-purple-700' : 'text-gray-400 hover:bg-gray-200/60'}`}
                title={currentNote?.isPinned ? 'Unpin note' : 'Pin note'}
                aria-label="Pin note"
              >
                <FaThumbtack size={12} />
              </button>
            )}

            {/* Reminder Button */}
            {canEdit && (
              <button
                onClick={() => setIsReminderModalOpen(true)}
                className={`p-1.5 rounded-lg transition ${reminder ? 'bg-amber-100 text-amber-800' : 'text-gray-500 hover:bg-gray-200/60'}`}
                title={reminder ? `Reminder set` : 'Set Reminder'}
                aria-label="Set Reminder"
              >
                <FaClock size={12} className={reminder ? 'text-amber-600' : 'text-purple-600'} />
              </button>
            )}

            {/* Comments Button */}
            <button
              onClick={scrollToComments}
              className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-200/60 transition relative"
              title="Comments"
              aria-label="Comments"
            >
              <FaComments size={12} className="text-purple-600" />
              {commentCount > 0 && (
                <span className="absolute -top-1 -right-1 px-1 bg-purple-600 text-white rounded-full text-[8px] font-bold">
                  {commentCount}
                </span>
              )}
            </button>

            {/* Version History Button */}
            <button
              onClick={() => setIsHistoryModalOpen(true)}
              className="p-1.5 text-gray-500 hover:bg-gray-200/60 rounded-lg transition"
              title="Version History"
              aria-label="Version History"
            >
              <FaHistory size={12} />
            </button>

            {/* Archive Button */}
            {!isTrashed && (
              <button
                onClick={handleToggleArchive}
                className={`p-1.5 rounded-lg transition ${isArchived ? 'bg-amber-100 text-amber-800' : 'text-gray-500 hover:bg-gray-200/60'}`}
                title={isArchived ? 'Unarchive note' : 'Archive note'}
                aria-label="Archive note"
              >
                <FaArchive size={12} />
              </button>
            )}

            {/* Move to Trash Button */}
            {isOwner && !isTrashed && (
              <button
                onClick={handleMoveToTrash}
                className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                title="Move to Trash"
                aria-label="Move to Trash"
              >
                <FaTrash size={12} />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Trashed Notice Banner */}
      {isTrashed && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-3">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-red-800 text-xs font-medium">
            <div className="flex items-center space-x-2">
              <FaTrash className="text-red-500" size={14} />
              <span>This note is in <strong>Trash</strong>. Restore it to edit or view active options.</span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleRestoreNote}
                className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg shadow-sm transition flex items-center space-x-1.5"
              >
                <FaUndo size={11} />
                <span>Restore Note</span>
              </button>
              {isOwner && (
                <button
                  onClick={handlePermanentDelete}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg shadow-sm transition flex items-center space-x-1.5"
                >
                  <FaTrash size={11} />
                  <span>Delete Permanently</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tags & Controls Toolbar */}
      <div className="bg-white border-b border-gray-100 py-2.5 px-4">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">

          {/* Note Tags List & Add Dropdown */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center space-x-1">
              <FaTag size={10} />
              <span>Tags:</span>
            </span>

            {noteTags.map((tag) => (
              <span
                key={tag}
                className="px-2.5 py-0.5 bg-purple-50 text-purple-700 text-xs font-semibold rounded-lg border border-purple-200 flex items-center space-x-1"
              >
                <span>{tag}</span>
                {canEdit && (
                  <button
                    onClick={() => handleRemoveTagFromNote(tag)}
                    className="hover:text-red-500 p-0.5"
                  >
                    <FaTimes size={10} />
                  </button>
                )}
              </span>
            ))}

            {/* Add Tag Dropdown Input */}
            {canEdit && (
              <div className="relative">
                <button
                  onClick={() => setShowTagDropdown(!showTagDropdown)}
                  className="px-2.5 py-0.5 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-semibold rounded-lg transition flex items-center space-x-1"
                >
                  <FaPlus size={9} />
                  <span>Tag</span>
                </button>

                {showTagDropdown && (
                  <div className="absolute left-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-xl shadow-xl z-20 p-2">
                    <input
                      type="text"
                      value={newTagInput}
                      onChange={(e) => setNewTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddTagToNote(newTagInput);
                        }
                      }}
                      placeholder="Type tag name..."
                      className="w-full px-2 py-1 text-xs border rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 mb-2"
                      autoFocus
                    />

                    {tags && tags.length > 0 && (
                      <div className="max-h-32 overflow-y-auto space-y-1 border-t pt-1">
                        <p className="text-[10px] font-bold text-gray-400 uppercase">Existing Tags</p>
                        {tags.map((t) => (
                          <div
                            key={t}
                            onClick={() => handleAddTagToNote(t)}
                            className="px-2 py-1 text-xs hover:bg-purple-50 rounded cursor-pointer text-gray-700 font-medium"
                          >
                            #{t}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Formatting & View Mode Controls */}
          <div className="flex items-center space-x-3">
            {/* Formatting shortcuts */}
            {canEdit && (
              <div className="hidden sm:flex items-center space-x-1 bg-gray-100 p-1 rounded-xl">
                <button
                  onClick={() => insertFormatting('**', '**')}
                  className="p-1.5 hover:bg-white text-gray-700 rounded-lg text-xs transition"
                  title="Bold"
                >
                  <FaBold size={11} />
                </button>
                <button
                  onClick={() => insertFormatting('*', '*')}
                  className="p-1.5 hover:bg-white text-gray-700 rounded-lg text-xs transition"
                  title="Italic"
                >
                  <FaItalic size={11} />
                </button>
                <button
                  onClick={() => insertFormatting('# ')}
                  className="p-1.5 hover:bg-white text-gray-700 rounded-lg text-xs transition"
                  title="Heading 1"
                >
                  <FaHeading size={11} />
                </button>
                <button
                  onClick={() => insertFormatting('> ')}
                  className="p-1.5 hover:bg-white text-gray-700 rounded-lg text-xs transition"
                  title="Quote"
                >
                  <FaQuoteLeft size={11} />
                </button>
                <button
                  onClick={() => insertFormatting('- ')}
                  className="p-1.5 hover:bg-white text-gray-700 rounded-lg text-xs transition"
                  title="Bullet List"
                >
                  <FaListUl size={11} />
                </button>
                <button
                  onClick={() => insertFormatting('```\n', '\n```')}
                  className="p-1.5 hover:bg-white text-gray-700 rounded-lg text-xs transition"
                  title="Code Block"
                >
                  <FaCode size={11} />
                </button>
              </div>
            )}

            {/* View Mode selector */}
            <div className="flex items-center bg-gray-100 p-1 rounded-xl text-xs font-bold text-gray-600">
              <button
                onClick={() => setViewMode('edit')}
                className={`px-3 py-1 rounded-lg transition ${viewMode === 'edit' ? 'bg-white text-purple-700 shadow-sm' : 'hover:text-gray-900'
                  }`}
              >
                Edit
              </button>
              <button
                onClick={() => setViewMode('split')}
                className={`px-3 py-1 rounded-lg transition hidden md:block ${viewMode === 'split' ? 'bg-white text-purple-700 shadow-sm' : 'hover:text-gray-900'
                  }`}
              >
                Split
              </button>
              <button
                onClick={() => setViewMode('preview')}
                className={`px-3 py-1 rounded-lg transition ${viewMode === 'preview' ? 'bg-white text-purple-700 shadow-sm' : 'hover:text-gray-900'
                  }`}
              >
                Preview
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Main Canvas Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 flex flex-col min-w-0">
        <div className="flex-1 bg-white rounded-2xl sm:rounded-3xl shadow-lg border border-gray-200 overflow-hidden flex flex-col md:flex-row min-h-[420px] sm:min-h-[500px]">

          {/* Editor Area */}
          {(viewMode === 'edit' || viewMode === 'split') && (
            <div className={`p-4 sm:p-6 flex flex-col flex-1 ${viewMode === 'split' ? 'border-r border-gray-200' : ''}`}>
              <textarea
                ref={textareaRef}
                value={content}
                onChange={handleContentChange}
                disabled={!canEdit}
                placeholder={canEdit ? 'Write your note content here using Markdown formatting...' : 'Read-only note content...'}
                className="w-full flex-1 bg-transparent resize-none focus:outline-none text-gray-800 text-base sm:text-lg leading-relaxed font-sans min-h-[300px]"
              />
            </div>
          )}

          {/* Markdown Preview Area */}
          {(viewMode === 'preview' || viewMode === 'split') && (
            <div className="p-4 sm:p-6 flex-1 bg-slate-50/50 overflow-y-auto prose max-w-none">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 pb-2 border-b">
                {title || 'Untitled Note'}
              </h2>
              {content ? (
                <div className="whitespace-pre-wrap text-gray-800 leading-relaxed font-sans text-sm sm:text-base">
                  {content}
                </div>
              ) : (
                <p className="text-sm text-gray-400 italic">No content to preview.</p>
              )}
            </div>
          )}

        </div>

        {/* Footer Statistics */}
        <div className="mt-3 sm:mt-4 flex flex-wrap items-center justify-between text-[11px] sm:text-xs text-gray-400 px-2 font-medium gap-2">
          <div className="flex items-center space-x-3 sm:space-x-4">
            <span>{wordCount} words</span>
            <span>{charCount} characters</span>
          </div>
          {lastSavedTime && (
            <span>Last saved at {lastSavedTime.toLocaleTimeString()}</span>
          )}
        </div>

        {/* Attachments Section */}
        <AttachmentsSection
          noteId={id}
          isOwner={isOwner}
          userPermission={userPermission}
          isTrashed={isTrashed}
        />

        {/* Comments & Discussion Thread Section */}
        <div ref={commentsSectionRef} className="mt-2">
          <CommentsSection
            noteId={id}
            isOwner={isOwner}
            userPermission={userPermission}
            isTrashed={isTrashed}
            currentUser={user}
            onCommentCountChange={(cnt) => setCommentCount(cnt)}
          />
        </div>
      </main>

      {/* Share Modal */}
      {isShareModalOpen && currentNote && (
        <ShareModal
          note={currentNote}
          onClose={() => setIsShareModalOpen(false)}
        />
      )}

      {/* Version History Modal */}
      {isHistoryModalOpen && (
        <VersionHistoryModal
          noteId={id}
          currentNote={currentNote}
          canEdit={canEdit}
          onClose={() => setIsHistoryModalOpen(false)}
          onVersionRestored={handleVersionRestored}
        />
      )}

      {/* Reminder Modal */}
      {isReminderModalOpen && (
        <ReminderModal
          noteId={id}
          noteTitle={title}
          isOpen={isReminderModalOpen}
          onClose={() => setIsReminderModalOpen(false)}
          currentReminder={reminder}
          onReminderUpdated={(updatedReminder) => setReminder(updatedReminder)}
        />
      )}
    </div>
  );
};

export default NoteEditor;
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
  updateNoteInRealTime
} from '../services/socket';
import ShareModal from '../components/ShareModal';
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
  FaSave
} from 'react-icons/fa';

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
  const [newTagInput, setNewTagInput] = useState('');
  const [showTagDropdown, setShowTagDropdown] = useState(false);

  const textareaRef = useRef(null);
  const isMountedRef = useRef(true);

  const isLoadedRef = useRef(false);

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

    return () => {
      isMountedRef.current = false;
      leaveNoteRoom(id);
    };
  }, [id, dispatch, navigate]);

  // Determine user permission
  const isOwner = currentNote?.isOwnedByCurrentUser || (currentNote?.createdBy && (currentNote.createdBy._id === user?.id || currentNote.createdBy._id === user?._id));
  const userPermission = currentNote?.userPermission || (isOwner ? 'owner' : 'editor');
  const canEdit = isOwner || userPermission === 'editor' || userPermission === 'write';

  // Immediate save helper for explicit save / navigation
  const saveNoteNow = async (updatedTitle, updatedContent, updatedTags) => {
    if (!canEdit || !id) return;
    setIsSaving(true);
    try {
      const result = await notesAPI.updateNote(id, {
        title: (updatedTitle !== undefined ? updatedTitle : title).trim() || 'Untitled Note',
        content: updatedContent !== undefined ? updatedContent : content,
        tags: updatedTags !== undefined ? updatedTags : noteTags
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
          tags: noteTags
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
      updateNoteInRealTime(id, content, val);
    }
  };

  // Handle content change
  const handleContentChange = (e) => {
    const val = e.target.value;
    setContent(val);
    if (canEdit && id) {
      updateNoteInRealTime(id, val, title);
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
    noteDataRef.current.content = newContent;

    if (id) {
      updateNoteInRealTime(id, newContent, title);
      debouncedSaveRef.current(id);
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
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">

          {/* Left section: Back button & Title */}
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <button
              onClick={handleBack}
              className="p-2 text-gray-500 hover:text-purple-700 hover:bg-purple-50 rounded-xl transition"
              title="Back to Dashboard"
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
                className="w-full text-lg sm:text-xl font-black text-gray-900 bg-transparent border-b border-transparent focus:border-purple-500 focus:outline-none transition py-0.5 truncate"
              />
            </div>
          </div>

          {/* Right section: Presence, Status, Share & Actions */}
          <div className="flex items-center space-x-2 sm:space-x-3">

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

            {/* Save status pill */}
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

            {/* Role Badge */}
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${isOwner
              ? 'bg-indigo-100 text-indigo-900 border border-indigo-200'
              : canEdit
                ? 'bg-purple-100 text-purple-900 border border-purple-200'
                : 'bg-amber-100 text-amber-900 border border-amber-200'
              }`}>
              {isOwner ? 'Owner' : canEdit ? 'Editor' : 'Viewer'}
            </span>

            {/* Pin Toggle */}
            <button
              onClick={handleTogglePin}
              className={`p-2 rounded-xl transition ${currentNote?.isPinned ? 'bg-purple-100 text-purple-700' : 'text-gray-400 hover:bg-gray-100'
                }`}
              title={currentNote?.isPinned ? 'Unpin note' : 'Pin note'}
            >
              <FaThumbtack size={14} />
            </button>

            {/* Manual Save Button */}
            {canEdit && (
              <button
                onClick={async () => {
                  await saveNoteNow();
                  toast.success('Note saved!');
                }}
                disabled={isSaving}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow transition flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                title="Save changes (Ctrl+S)"
              >
                <FaSave size={12} />
                <span className="hidden sm:inline">Save</span>
              </button>
            )}

            {/* Share Button (Only if owner) */}
            {isOwner && (
              <button
                onClick={() => setIsShareModalOpen(true)}
                className="px-3.5 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl text-xs hover:brightness-110 shadow transition flex items-center space-x-1.5"
              >
                <FaShareAlt size={12} />
                <span className="hidden sm:inline">Share</span>
              </button>
            )}

          </div>
        </div>
      </header>

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
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 flex flex-col">
        <div className="flex-1 bg-white rounded-3xl shadow-lg border border-gray-200 overflow-hidden flex flex-col md:flex-row min-h-[500px]">

          {/* Editor Area */}
          {(viewMode === 'edit' || viewMode === 'split') && (
            <div className={`p-6 flex flex-col flex-1 ${viewMode === 'split' ? 'border-r border-gray-200' : ''}`}>
              <textarea
                ref={textareaRef}
                value={content}
                onChange={handleContentChange}
                disabled={!canEdit}
                placeholder={canEdit ? 'Write your note content here using Markdown formatting...' : 'Read-only note content...'}
                className="w-full flex-1 bg-transparent resize-none focus:outline-none text-gray-800 text-base sm:text-lg leading-relaxed font-sans"
              />
            </div>
          )}

          {/* Markdown Preview Area */}
          {(viewMode === 'preview' || viewMode === 'split') && (
            <div className="p-6 flex-1 bg-slate-50/50 overflow-y-auto prose max-w-none">
              <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b">
                {title || 'Untitled Note'}
              </h2>
              {content ? (
                <div className="whitespace-pre-wrap text-gray-800 leading-relaxed font-sans">
                  {content}
                </div>
              ) : (
                <p className="text-sm text-gray-400 italic">No content to preview.</p>
              )}
            </div>
          )}

        </div>

        {/* Footer Statistics */}
        <div className="mt-4 flex items-center justify-between text-xs text-gray-400 px-2 font-medium">
          <div className="flex items-center space-x-4">
            <span>{wordCount} words</span>
            <span>{charCount} characters</span>
          </div>
          {lastSavedTime && (
            <span>Last saved at {lastSavedTime.toLocaleTimeString()}</span>
          )}
        </div>
      </main>

      {/* Share Modal */}
      {isShareModalOpen && currentNote && (
        <ShareModal
          note={currentNote}
          onClose={() => setIsShareModalOpen(false)}
        />
      )}
    </div>
  );
};

export default NoteEditor;
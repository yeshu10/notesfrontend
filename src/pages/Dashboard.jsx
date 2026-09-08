import React, { useState, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  setNotes,
  setTags,
  setSelectedTag,
  setSortBy,
  setLoading,
  setError,
  setActiveFilter,
  setCurrentUserId
} from '../store/slices/notesSlice';
import { notesAPI } from '../services/api';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import NoteCard from '../components/NoteCard';
import ShareModal from '../components/ShareModal';
import toast from 'react-hot-toast';
import {
  FaPlus,
  FaFilter,
  FaSortAmountDown,
  FaTimes,
  FaStickyNote,
  FaFolderOpen,
  FaSearch,
  FaArrowLeft,
  FaArrowRight,
  FaTag
} from 'react-icons/fa';

const Dashboard = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { user } = useSelector((state) => state.auth);
  const {
    notes,
    activeFilter,
    selectedTag,
    searchQuery,
    sortBy,
    pagination,
    loading
  } = useSelector((state) => state.notes);

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sharingNote, setSharingNote] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Sync current user ID to notes slice
  useEffect(() => {
    if (user?._id || user?.id) {
      dispatch(setCurrentUserId(user._id || user.id));
    }
  }, [user, dispatch]);

  // Fetch notes from Backend based on active tab, tag, search, sort, and page
  const fetchNotesData = useCallback(async () => {
    dispatch(setLoading(true));
    try {
      const data = await notesAPI.getAllNotes({
        page: currentPage,
        limit: 12,
        filter: activeFilter,
        tag: selectedTag,
        search: searchQuery,
        sort: sortBy
      });

      dispatch(setNotes(data));

      // Also fetch latest user tags for sidebar
      const tagData = await notesAPI.getUserTags();
      if (tagData?.tags) {
        dispatch(setTags(tagData.tags));
      }
    } catch (err) {
      if (err.message !== 'Request cancelled') {
        dispatch(setError(err.message));
      }
    } finally {
      dispatch(setLoading(false));
    }
  }, [dispatch, currentPage, activeFilter, selectedTag, searchQuery, sortBy]);

  // Re-fetch notes whenever filters, search, page, or tag change
  useEffect(() => {
    fetchNotesData();
  }, [fetchNotesData]);

  // Always fetch notes on Dashboard mount (page refresh) and listen for logo clicks
  useEffect(() => {
    fetchNotesData();
    const handleRefreshNotes = () => fetchNotesData();
    window.addEventListener('refreshNotes', handleRefreshNotes);
    return () => window.removeEventListener('refreshNotes', handleRefreshNotes);
  }, []);

  // Reset page when filter/search/tag changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeFilter, selectedTag, searchQuery, sortBy]);

  const handleCreateNote = async () => {
    try {
      const newNote = await notesAPI.createNote({
        title: 'Untitled Note',
        content: '',
        tags: selectedTag ? [selectedTag] : []
      });
      toast.success('Note created!');
      navigate(`/notes/${newNote._id}`);
    } catch (error) {
      toast.error(error.message || 'Failed to create note');
    }
  };

  const getHeaderTitle = () => {
    if (selectedTag) return `Tag: #${selectedTag}`;
    switch (activeFilter) {
      case 'mine': return 'My Created Notes';
      case 'shared': return 'Notes Shared With Me';
      case 'pinned': return 'Pinned Notes';
      case 'favorites': return 'Favorite Notes';
      case 'reminders': return 'Upcoming Reminders';
      case 'archived': return 'Archived Notes';
      case 'trash': return 'Trash';
      default: return 'All Notes';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Navbar */}
      <Navbar
        onToggleMobileSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)}
        mobileSidebarOpen={mobileSidebarOpen}
      />

      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* Left Sidebar Navigation */}
        <Sidebar
          mobileOpen={mobileSidebarOpen}
          setMobileOpen={setMobileSidebarOpen}
          onRefreshNotes={fetchNotesData}
        />

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0 overflow-y-auto">

          {/* Header Bar with Title, Active Filters & Sorting */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center space-x-3">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  {getHeaderTitle()}
                </h1>
                {pagination?.totalNotes !== undefined && (
                  <span className="px-2.5 py-0.5 bg-purple-50 text-purple-700 border border-purple-200/70 rounded-full text-xs font-extrabold">
                    {pagination.totalNotes} {pagination.totalNotes === 1 ? 'note' : 'notes'}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Real-time collaborative workspace notes
              </p>
            </div>

            {/* Controls: Active Tag Pill & Sort Dropdown */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Selected Tag Pill */}
              {selectedTag && (
                <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-purple-50 text-purple-700 rounded-full text-xs font-bold border border-purple-200 shadow-2xs">
                  <FaTag size={10} />
                  <span>#{selectedTag}</span>
                  <button
                    onClick={() => dispatch(setSelectedTag(''))}
                    className="hover:text-purple-950 p-0.5 cursor-pointer"
                    aria-label="Remove tag filter"
                  >
                    <FaTimes size={10} />
                  </button>
                </div>
              )}

              {/* Active Search Pill */}
              {searchQuery && (
                <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold border border-indigo-200 shadow-2xs">
                  <FaSearch size={10} />
                  <span className="truncate max-w-[150px]">"{searchQuery}"</span>
                </div>
              )}

              {/* Sorting Dropdown */}
              <div className="flex items-center space-x-1.5 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-xs text-xs font-semibold text-slate-700">
                <FaSortAmountDown className="text-purple-600 flex-shrink-0" />
                <span className="text-slate-500 font-medium">Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => dispatch(setSortBy(e.target.value))}
                  className="bg-transparent focus:outline-none font-bold text-slate-800 cursor-pointer text-xs"
                >
                  <option value="updated">Recently Updated</option>
                  <option value="created">Recently Created</option>
                  <option value="title">Title (A to Z)</option>
                  <option value="title-desc">Title (Z to A)</option>
                </select>
              </div>

              {/* Floating Quick Add Note Button */}
              <button
                onClick={handleCreateNote}
                className="px-4 py-2 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 hover:brightness-105 active:scale-[0.98] text-white text-xs font-bold rounded-xl shadow-md shadow-purple-500/20 transition flex items-center space-x-1.5 flex-shrink-0 cursor-pointer"
              >
                <FaPlus size={11} />
                <span>Add Note</span>
              </button>
            </div>
          </div>

          {/* Notes Grid Display */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-48 bg-white rounded-2xl p-5 shadow-xs border border-slate-200/70 animate-pulse flex flex-col justify-between relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-slate-200" />
                  <div className="space-y-3 pt-1">
                    <div className="flex items-center justify-between">
                      <div className="h-3.5 bg-slate-200 rounded-full w-20" />
                      <div className="h-3.5 bg-slate-200 rounded-full w-8" />
                    </div>
                    <div className="h-4 bg-slate-200 rounded-full w-3/4" />
                    <div className="h-3 bg-slate-150 rounded-full w-full" />
                    <div className="h-3 bg-slate-150 rounded-full w-5/6" />
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    <div className="h-3 bg-slate-200 rounded-full w-1/3" />
                    <div className="h-3 bg-slate-200 rounded-full w-14" />
                  </div>
                </div>
              ))}
            </div>
          ) : notes.length === 0 ? (
            /* Empty State Illustration */
            <div className="py-14 sm:py-20 text-center bg-white rounded-3xl border border-dashed border-slate-200 p-8 max-w-lg mx-auto shadow-xs my-8">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-50 to-indigo-50 text-purple-600 flex items-center justify-center mx-auto mb-4 text-2xl shadow-inner border border-purple-100/60">
                <FaFolderOpen />
              </div>
              <h3 className="text-xl font-extrabold text-slate-900 mb-2">
                No notes found
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 mb-6 leading-relaxed max-w-sm mx-auto">
                {searchQuery
                  ? `No matching notes found for "${searchQuery}". Try adjusting your search term.`
                  : selectedTag
                    ? `No notes currently labeled with #${selectedTag}.`
                    : activeFilter === 'trash'
                      ? 'Your trash is completely empty.'
                      : activeFilter === 'archived'
                        ? 'No archived notes at the moment.'
                        : activeFilter === 'shared'
                          ? 'No notes shared with you yet.'
                          : 'Start capturing ideas, drafting thoughts, and collaborating with your team!'}
              </p>
              <button
                onClick={handleCreateNote}
                className="px-6 py-3 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 hover:brightness-105 active:scale-[0.98] text-white font-bold rounded-xl text-xs sm:text-sm shadow-lg shadow-purple-500/25 transition inline-flex items-center space-x-2 cursor-pointer"
              >
                <FaPlus size={11} />
                <span>Create New Note</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {notes.map((note) => (
                <NoteCard
                  key={note._id}
                  note={note}
                  onShareClick={(n) => setSharingNote(n)}
                />
              ))}
            </div>
          )}

          {/* Pagination Controls */}
          {pagination && pagination.totalPages > 1 && (
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200/80 pt-4 text-xs font-semibold text-slate-500">
              <p className="text-center sm:text-left">
                Showing Page <span className="font-bold text-purple-700">{pagination.currentPage}</span> of{' '}
                <span className="font-bold text-slate-800">{pagination.totalPages}</span>
              </p>
              <div className="flex space-x-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={!pagination.hasPrevPage}
                  className="px-3.5 py-1.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-40 font-bold shadow-2xs flex items-center space-x-1 min-h-[36px] transition cursor-pointer"
                >
                  <FaArrowLeft size={10} />
                  <span>Previous</span>
                </button>
                <button
                  onClick={() => setCurrentPage((p) => p + 1)}
                  disabled={!pagination.hasNextPage}
                  className="px-3.5 py-1.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-40 font-bold shadow-2xs flex items-center space-x-1 min-h-[36px] transition cursor-pointer"
                >
                  <span>Next</span>
                  <FaArrowRight size={10} />
                </button>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* Share Modal */}
      {sharingNote && (
        <ShareModal
          note={sharingNote}
          onClose={() => setSharingNote(null)}
        />
      )}
    </div>
  );
};

export default Dashboard;
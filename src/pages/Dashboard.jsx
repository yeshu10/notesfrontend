import React, { useEffect, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { notesAPI } from '../services/api';
import { setNotes, setLoading, setError, addNote, removeNote, clearNotes } from '../store/slices/notesSlice';
import { logout, setCredentials } from '../store/slices/authSlice';
import { disconnectSocket, initializeSocket } from '../services/socket';
import toast from 'react-hot-toast';
import { FaShare, FaTrash } from 'react-icons/fa';
import { LuNotebookPen } from "react-icons/lu";
import Navbar from '../components/Navbar';

const Dashboard = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { notes, loading } = useSelector((state) => state.notes);
  const { user, token } = useSelector((state) => state.auth);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const initialFetchDone = useRef(false);
  const [pageLoading, setPageLoading] = useState(true);
    const [noteToDelete, setNoteToDelete] = useState(null);

  // Initialization effect for Dashboard
  useEffect(() => {
    console.log('Dashboard mounted or dependencies changed', { 
      user: !!user, 
      notes: notes.length, 
      loading, 
      isFetching,
      initialFetchDone: initialFetchDone.current,
      page
    });
    
    // When component mounts for the first time
    if (!initialFetchDone.current) {
      console.log('Dashboard mounted, initial load');
      // We no longer clear notes here - just fetch from backend directly
    }
    
    // Check if we're logged in and haven't fetched notes yet
    const shouldFetchNotes = user && 
                            !loading && 
                            !isFetching && 
                            (!initialFetchDone.current || page > 1);
                            
    if (shouldFetchNotes) {
      console.log('Fetching notes based on condition check');
      fetchNotes();
      if (!initialFetchDone.current) {
        initialFetchDone.current = true;
        console.log('Setting initialFetchDone to true');
      }
    }
  }, [user, page]);

  useEffect(() => {
    // Check if we have user data from localStorage but not in state
    if (token && !user) {
      // This can happen on page refresh when token exists but Redux state was reset
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          const userData = JSON.parse(storedUser);
          dispatch(setCredentials({ user: userData, token }));
          console.log('Restored user from localStorage:', userData.name);
        } catch (error) {
          console.error('Error parsing stored user:', error);
        }
      }
    }
    
    // Set page as loaded after a short delay
    setTimeout(() => {
      setPageLoading(false);
    }, 500);
  }, []);

  // Ensure socket is connected when dashboard loads
  useEffect(() => {
    console.log('Dashboard mounted, checking socket connection');
    if (token) {
      initializeSocket(token);
    }
    
    return () => {
      // No need to disconnect socket on dashboard unmount
      // as we want to keep it active for other components
    };
  }, [token]);

  const fetchNotes = async () => {
    if (loading || isFetching) {
      console.log('Already loading notes, skipping fetch');
      return;
    }
    
    setIsFetching(true);
    console.log('Starting to fetch notes for page:', page);
    dispatch(setLoading(true));
    try {
      const response = await notesAPI.getAllNotes(page);
      console.log('Notes fetched successfully:', response);
      dispatch(setNotes(response.notes));
      setPagination(response.pagination);
    } catch (error) {
      console.error('Error fetching notes:', error);
      dispatch(setError(error.response?.data?.message || 'Error fetching notes'));
      toast.error('Error fetching notes');
    } finally {
      dispatch(setLoading(false));
      setIsFetching(false);
      console.log('Fetch complete, loading and isFetching set to false');
    }
  };

  const handleCreateNote = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    
    if (!newNoteTitle.trim()) {
      toast.error('Title is required');
      return;
    }
 
    setIsSubmitting(true);
    try {
      console.log('Creating new note:', { title: newNoteTitle, content: newNoteContent || 'New note' });
      const data = await notesAPI.createNote(newNoteTitle, newNoteContent || 'New note');
      console.log('Note created successfully:', data);
      dispatch(addNote(data));
      toast.success('Note created successfully');
      setShowCreateModal(false);
      navigate(`/notes/${data._id}`);
    } catch (error) {
      console.error('Create note error:', error);
      toast.error(error.response?.data?.message || 'Error creating note');
    } finally {
      setIsSubmitting(false);
      setNewNoteTitle('');
      setNewNoteContent('');
    }
  };

  const handleLogout = () => {
    // Clear notes before logging out to prevent them from appearing for other users
    dispatch(clearNotes());
    dispatch(logout());
    disconnectSocket();
    navigate('/login');
  };

  

  const handleDeleteNote = async (noteId) => {
    try {
      await notesAPI.deleteNote(noteId);
      dispatch(removeNote(noteId));
      toast.success('Note deleted successfully');
    } catch (error) {
      console.error('Delete note error:', error);
      toast.error(error.message || 'Error deleting note');
    }
  };

  // Called when user confirms delete in modal
  const confirmDelete = () => {
    if (noteToDelete) {
      handleDeleteNote(noteToDelete);
      setNoteToDelete(null); // close modal
    }
  };

  // Show loading state while page is initially loading
  if (pageLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your notes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-pink-400">My Notes</h2>
            

            <button
  onClick={() => setShowCreateModal(true)}
  className="flex items-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-400 hover:bg-indigo-700 cursor-pointer"
>
  <LuNotebookPen className="text-lg" />
  Note
</button>
          </div>

          {loading ? (
            <div className="text-center">Loading...</div>
          ) : notes && notes.length > 0 ? (
            <>
      

<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
  {notes.map((note) => (
    <div
      key={note._id}
      className="bg-white overflow-hidden shadow rounded-lg hover:shadow-lg transition-shadow duration-300 flex flex-col justify-between"
    >
      {/* Title bar with gradient, title text, delete button, date, collaborators */}
      <div className="relative bg-gradient-to-r from-blue-400 via-pink-200 to-purple-400 rounded-t-lg px-4 py-3 flex items-center justify-between text-white">
        <h3 className="text-lg font-semibold truncate max-w-[calc(100%-3rem)]">
          {note.title}
        </h3>

        {/* Delete Button inside title bar */}
        <button
          onClick={(e) => {
            e.stopPropagation();
             
                  setNoteToDelete(note._id);
          }}
          className="ml-2 text-white hover:text-red-300 p-1 rounded-full focus:outline-none focus:ring-2 focus:ring-white cursor-pointer"
          title="Delete Note"
        >
          <FaTrash />
        </button>
      </div>

      {/* Clickable content area */}
       <div
        className="px-4 py-5 cursor-pointer flex-grow"
        onClick={() => navigate(`/notes/${note._id}`)}
      >
        {/* First line of note content */}
        <p className="text-gray-700 truncate">{note.content.split('\n')[0]}</p>
      </div>

      {/* Bottom bar with last updated time on bottom-left and share button bottom-right */}
      <div className="px-4 py-3 bg-gray-50 flex justify-between items-center text-gray-500 text-xs">
        <span>
          {new Date(note.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
         <span className="flex items-center justify-center w-6 h-6 bg-indigo-500 text-white text-xs font-semibold rounded-full">
          {note.collaborators.length}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/notes/${note._id}?share=true`);
          }}
          className="text-blue-600 hover:text-blue-800 p-1 rounded-full bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer"
          title="Share Note"
        >
          <FaShare />
        </button>
      </div>
    </div>
  ))}
</div>



              {/* Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <div className="mt-6 flex justify-center space-x-4">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={!pagination.hasPrevPage}
                    className={`px-4 py-2 text-sm rounded-md ${
                      pagination.hasPrevPage
                        ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-600 self-center">
                    Page {pagination.currentPage} of {pagination.totalPages}
                  </span>
                  <button
                    onClick={() => setPage(p => p + 1)}
                    disabled={!pagination.hasNextPage}
                    className={`px-4 py-2 text-sm rounded-md ${
                      pagination.hasNextPage
                        ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center text-lime-500">Looks like you haven't written any notes yet. Let's get those ideas flowing!</div>
          )}
        </div>
      </main>

      

      {showCreateModal && (
  <div className="fixed inset-0 bg-white/60 backdrop-blur-md flex items-center justify-center z-50">
    <div className="bg-white rounded-lg p-8 max-w-lg w-full max-h-[80vh] overflow-auto shadow-lg">
      <h3 className="text-xl font-semibold text-indigo-500 mb-6">
        Create New Note
      </h3>
      <form onSubmit={handleCreateNote}>
        <div className="space-y-6">
          <div>
            <label
              htmlFor="title"
              className="block text-sm font-medium text-indigo-700"
            >
              Title
            </label>
            <input
              id="title"
              type="text"
              value={newNoteTitle}
              onChange={(e) => setNewNoteTitle(e.target.value)}
              placeholder="Note title"
              className="mt-2 w-full px-4 py-3 border border-indigo-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400"
              required
            />
          </div>
          <div>
            <label
              htmlFor="content"
              className="block text-sm font-medium text-indigo-700"
            >
              Initial Content
            </label>
            <textarea
              id="content"
              value={newNoteContent}
              onChange={(e) => setNewNoteContent(e.target.value)}
              placeholder="Start writing..."
              className="mt-2 w-full px-4 py-3 border border-indigo-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400"
              rows={5}
            />
          </div>
        </div>
        <div className="mt-8 flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => {
              setShowCreateModal(false);
              setNewNoteTitle('');
              setNewNoteContent('');
            }}
            className="px-5 py-2 text-sm font-medium text-indigo-700 hover:text-indigo-900 bg-indigo-100 rounded-md transition"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className={`px-5 py-2 text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 transition ${
              isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating...' : 'Create'}
          </button>
        </div>
      </form>
    </div>
  </div>
)}



      {noteToDelete && (
        <div className="fixed inset-0 bg-opacity-20 backdrop-blur-sm flex items-center justify-center z-50">
  <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl border border-gray-200">
    <h2 className="text-xl font-semibold mb-4 text-gray-800">Confirm Delete</h2>
    <p className="mb-6 text-gray-600">Are you sure you want to delete this note?</p>
    <div className="flex justify-end space-x-4">
      <button
        onClick={() => setNoteToDelete(null)}
        className="px-5 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
      >
        Cancel
      </button>
      <button
        onClick={confirmDelete}
        className="px-5 py-2 rounded-lg bg-red-400 text-white hover:bg-red-500 transition"
      >
        Yes, Delete
      </button>
    </div>
  </div>
</div>

      )}
      
    </div>
    
  );
};

export default Dashboard; 
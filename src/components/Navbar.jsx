import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { logout } from '../store/slices/authSlice';
import { clearNotes, setSearchQuery, setActiveFilter, setSelectedTag } from '../store/slices/notesSlice';
import { disconnectSocket } from '../services/socket';
import { notesAPI } from '../services/api';
import toast from 'react-hot-toast';
import { IoMdLogOut } from 'react-icons/io';
import { FaSearch, FaPlus, FaBars, FaTimes } from 'react-icons/fa';
import NotificationCenter from './NotificationCenter';

const Navbar = ({ onToggleMobileSidebar, mobileSidebarOpen }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const { searchQuery } = useSelector((state) => state.notes);

  const handleLogout = () => {
    dispatch(clearNotes());
    dispatch(logout());
    disconnectSocket();
    navigate('/login');
  };

  const handleCreateNewNote = async () => {
    try {
      const newNote = await notesAPI.createNote({
        title: 'Untitled Note',
        content: ''
      });
      toast.success('New note created!');
      navigate(`/notes/${newNote._id}`);
    } catch (error) {
      toast.error(error.message || 'Failed to create note');
    }
  };

  const handleLogoClick = () => {
    dispatch(setActiveFilter('all'));
    dispatch(setSelectedTag(''));
    dispatch(setSearchQuery(''));
    if (window.location.pathname === '/') {
      window.dispatchEvent(new Event('refreshNotes'));
    } else {
      navigate('/');
    }
  };

  return (
    <nav className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 shadow-lg sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center space-x-4">

          {/* Left section: Hamburger & Logo */}
          <div className="flex items-center space-x-3">
            <button
              onClick={onToggleMobileSidebar}
              className="lg:hidden p-2 rounded-lg text-white hover:bg-white/10 transition"
              title="Toggle sidebar"
            >
              {mobileSidebarOpen ? <FaTimes size={18} /> : <FaBars size={18} />}
            </button>

            <div
              onClick={handleLogoClick}
              className="cursor-pointer flex items-center space-x-2"
              title="NoteNest Home"
            >
              <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white font-black text-lg shadow-inner border border-white/30">
                N
              </div>
              <h1 className="text-xl font-extrabold text-white tracking-wide hidden sm:block">
                NoteNest
              </h1>
            </div>
          </div>

          {/* Center section: Global Search Bar */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => dispatch(setSearchQuery(e.target.value))}
                placeholder="Search notes by title, content, or tags..."
                className="w-full pl-10 pr-8 py-2 bg-white/15 backdrop-blur-md text-white placeholder-white/70 rounded-full border border-white/20 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-white/50 focus:bg-white/25 transition duration-200"
              />
              <FaSearch className="absolute left-3.5 top-3 text-white/70" size={13} />
              {searchQuery && (
                <button
                  onClick={() => dispatch(setSearchQuery(''))}
                  className="absolute right-3 top-2.5 text-white/70 hover:text-white"
                >
                  <FaTimes size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Right section: Create Note, Notifications & User Info */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            <button
              onClick={handleCreateNewNote}
              className="px-3.5 py-2 bg-white text-purple-700 font-bold rounded-full text-xs sm:text-sm hover:bg-purple-50 transition shadow flex items-center space-x-1.5 transform hover:scale-105 active:scale-95"
            >
              <FaPlus size={12} />
              <span className="hidden md:inline">New Note</span>
            </button>

            <NotificationCenter />

            <div className="h-6 w-px bg-white/20 hidden sm:block" />

            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full bg-white/20 text-white font-bold flex items-center justify-center text-xs border border-white/30">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <span className="text-white font-semibold text-sm hidden xl:inline">
                {user?.name || 'User'}
              </span>

              <button
                onClick={handleLogout}
                className="p-2 text-white hover:bg-white/10 rounded-full transition"
                title="Logout"
              >
                <IoMdLogOut size={20} />
              </button>
            </div>
          </div>

        </div>
      </div>
    </nav>
  );
};

export default Navbar;
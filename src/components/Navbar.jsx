import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { logout } from '../store/slices/authSlice';
import { clearNotes } from '../store/slices/notesSlice';
import { disconnectSocket } from '../services/socket';
import { IoMdLogOut } from "react-icons/io";

const Navbar = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  const handleLogout = () => {
    
    dispatch(clearNotes());
    dispatch(logout());
    disconnectSocket();
    navigate('/login');
  };

  return (
 <nav className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center">
            <h1 className="text-xl font-bold text-white drop-shadow-sm">Collaborative Notes</h1>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-white font-medium">{user?.name || 'User'}</span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 text-white hover:text-gray-200 transition-colors duration-200 cursor-pointer"
            >
              Logout <IoMdLogOut className="ml-1" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar; 
import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { clearNotes } from '../store/slices/notesSlice';

const PrivateRoute = ({ children }) => {
  const dispatch = useDispatch();
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const { notes } = useSelector((state) => state.notes);

  // When a user enters a private route, only verify user data
  useEffect(() => {
    if (isAuthenticated && user) {
      console.log('PrivateRoute: User authenticated', {
        userId: user.id || user._id,
        userName: user.name
      });
      
      // We no longer clear notes here since we do it on login/logout
      // This was causing notes to disappear even when they should be shown
    }
  }, [isAuthenticated, user?.id]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default PrivateRoute; 
import React, { useState, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import { setCredentials } from '../store/slices/authSlice';
import { clearNotes } from '../store/slices/notesSlice';
import { initializeSocket } from '../services/socket';
import toast from 'react-hot-toast';
import { FaEye, FaEyeSlash } from 'react-icons/fa';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const passwordInputRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }
    
    setLoading(true);

    try {
      // Clear any existing notes data first
      dispatch(clearNotes());
      
      const data = await authAPI.register(name, email, password);
      dispatch(setCredentials(data));
      initializeSocket(data.token);
      navigate('/');
      toast.success('Registration successful!');
    } catch (error) {
      toast.error(error.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setShowPassword(!showPassword);
    // Maintain focus after toggling visibility
    setTimeout(() => {
      if (passwordInputRef.current) {
        passwordInputRef.current.focus();
      }
    }, 10);
  };

  
return (
    // <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
    //   <div className="max-w-md w-full space-y-8">
    //     <div className="text-center">
    //       <h1 className="text-4xl font-bold text-purple-500">NoteNest</h1>
    //       <h2 className="mt-4 text-2xl font-semibold text-gray-800">
    //         Create your account
    //       </h2>
    //       <p className="mt-2 text-sm text-gray-600">
    //         Or{' '}
    //         <Link
    //           to="/login"
    //           className="font-medium text-indigo-600 hover:text-indigo-500"
    //         >
    //           sign in to your account
    //         </Link>
    //       </p>
    //     </div>
    //     <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
    //       <div className="space-y-4">
    //         <div>
    //           <label htmlFor="name" className="sr-only">Full Name</label>
    //           <input
    //             id="name"
    //             name="name"
    //             type="text"
    //             required
    //             value={name}
    //             onChange={(e) => setName(e.target.value)}
    //             className="block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-500 text-gray-900 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
    //             placeholder="Full Name"
    //           />
    //         </div>

    //         <div>
    //           <label htmlFor="email-address" className="sr-only">Email address</label>
    //           <input
    //             id="email-address"
    //             name="email"
    //             type="email"
    //             autoComplete="email"
    //             required
    //             value={email}
    //             onChange={(e) => setEmail(e.target.value)}
    //             className="block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-500 text-gray-900 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
    //             placeholder="Email address"
    //           />
    //         </div>

    //         <div className="relative">
    //           <label htmlFor="password" className="sr-only">Password</label>
    //           <input
    //             id="password"
    //             name="password"
    //             type={showPassword ? 'text' : 'password'}
    //             autoComplete="new-password"
    //             required
    //             ref={passwordInputRef}
    //             value={password}
    //             onChange={(e) => setPassword(e.target.value)}
    //             minLength={6}
    //             className="block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-500 text-gray-900 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
    //             placeholder="Password (min. 6 characters)"
    //           />
    //           <div className="absolute inset-y-0 right-3 flex items-center">
    //             <button
    //               type="button"
    //               onClick={togglePasswordVisibility}
    //               tabIndex={-1}
    //               aria-label={showPassword ? "Hide password" : "Show password"}
    //               className="text-gray-400 hover:text-gray-600 focus:outline-none"
    //             >
    //               {showPassword ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
    //             </button>
    //           </div>
    //         </div>
    //       </div>


    //       <div>
    //         <button
    //           type="submit"
    //           disabled={loading}
    //           className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
    //         >
    //           {loading ? 'Creating account...' : 'Create account'}
    //         </button>
    //       </div>
    //     </form>
    //   </div>
    // </div>
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-100 via-indigo-100 to-pink-100 py-12 px-4 sm:px-6 lg:px-8">
  <div className="max-w-md w-full bg-white/70 backdrop-blur-md rounded-xl shadow-xl p-8 space-y-8">
    <div className="text-center">
      <h1 className="text-4xl font-extrabold text-purple-600 drop-shadow-md">NoteNest</h1>
      <h2 className="mt-4 text-2xl font-semibold text-gray-800">Create your account</h2>
      <p className="mt-2 text-sm text-gray-600">
        Or{' '}
        <Link
          to="/login"
          className="font-medium text-indigo-600 hover:text-indigo-500 transition"
        >
          sign in
        </Link>
      </p>
    </div>

    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-4">
        <input
          id="name"
          name="name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-500 text-gray-900 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none sm:text-sm transition"
          placeholder="Full Name"
        />

        <input
          id="email-address"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-500 text-gray-900 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none sm:text-sm transition"
          placeholder="Email address"
        />

        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            required
            ref={passwordInputRef}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-500 text-gray-900 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none sm:text-sm transition"
            placeholder="Password (min. 6 characters)"
          />
          <div className="absolute inset-y-0 right-3 flex items-center">
            <button
              type="button"
              onClick={togglePasswordVisibility}
              tabIndex={-1}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="text-gray-400 hover:text-gray-600 focus:outline-none transition"
            >
              {showPassword ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
            </button>
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full flex justify-center py-2 px-4 text-sm font-medium rounded-md text-white bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition"
      >
        {loading ? 'Creating account...' : 'Create account'}
      </button>
    </form>
  </div>
</div>

  );

};

export default Register; 
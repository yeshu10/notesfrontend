import React, { useState, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import { setCredentials } from '../store/slices/authSlice';
import { clearNotes } from '../store/slices/notesSlice';
import { initializeSocket } from '../services/socket';
import toast from 'react-hot-toast';
import { FaEye, FaEyeSlash } from 'react-icons/fa';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const passwordInputRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Clear any existing notes data first to prevent showing notes from previous users
      dispatch(clearNotes());
      
      const data = await authAPI.login(email, password);
      console.log('Login response:', {
        userData: data.user,
        userId: data.user.id,
        user_id: data.user._id,
        token: data.token ? 'Present' : 'Missing'
      });
      dispatch(setCredentials(data));
      initializeSocket(data.token);
      navigate('/');
      toast.success('Login successful!');
    } catch (error) {
      console.error('Login error:', error);
      toast.error(error.response?.data?.message || 'Login failed');
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
 
    //     <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-100 to-indigo-100 px-4 py-12 sm:px-6 lg:px-8">
    //   <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-2xl shadow-lg border border-gray-100">
    //     <div className="text-center">
    //       <h2 className="text-3xl font-bold text-purple-700">Let’s sign in</h2>
    //       <p className="mt-2 text-sm text-gray-600">
    //         Or{' '}
    //         <Link to="/register" className="font-medium text-indigo-600 hover:text-indigo-500 transition duration-150">
    //           create a new account
    //         </Link>
    //       </p>
    //     </div>
    //     <form className="space-y-6" onSubmit={handleSubmit}>
    //       <div className="space-y-4">
    //         <div>
    //           <label htmlFor="email-address" className="sr-only">
    //             Email address
    //           </label>
    //           <input
    //             id="email-address"
    //             name="email"
    //             type="email"
    //             autoComplete="email"
    //             required
    //             value={email}
    //             onChange={(e) => setEmail(e.target.value)}
    //             className="w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
    //             placeholder="Email address"
    //           />
    //         </div>
    //         <div className="relative">
    //           <label htmlFor="password" className="sr-only">
    //             Password
    //           </label>
    //           <input
    //             id="password"
    //             name="password"
    //             type={showPassword ? 'text' : 'password'}
    //             autoComplete="current-password"
    //             required
    //             ref={passwordInputRef}
    //             value={password}
    //             onChange={(e) => setPassword(e.target.value)}
    //             className="w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
    //             placeholder="Password"
    //           />
    //           <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
    //             <button
    //               type="button"
    //               className="text-gray-400 hover:text-indigo-500 focus:outline-none"
    //               onClick={togglePasswordVisibility}
    //               tabIndex={-1}
    //               aria-label={showPassword ? 'Hide password' : 'Show password'}
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
    //           className={`w-full py-3 px-4 text-sm font-semibold rounded-md shadow-md text-white ${
    //             loading ? 'bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300 cursor-not-allowed' : 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:bg-indigo-700'
    //           } transition duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
    //         >
    //           {loading ? 'Signing in...' : 'Sign in'}
    //         </button>
    //       </div>
    //     </form>
    //   </div>
    // </div>
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-100 via-indigo-50 to-purple-100 px-4 py-10 sm:px-6 lg:px-8">
  <div className="w-full max-w-md space-y-8 p-6 sm:p-8 bg-white rounded-3xl shadow-2xl border border-gray-200 transition-all duration-300">
    <div className="text-center">
      <h2 className="text-3xl sm:text-4xl font-bold text-purple-600 tracking-wide">Let’s sign in</h2>
      <p className="mt-2 text-sm text-gray-600">
        Or{' '}
        <Link
          to="/register"
          className="font-medium text-indigo-600 hover:text-indigo-500 transition duration-200"
        >
          create a new account
        </Link>
      </p>
    </div>

    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="space-y-5">
        <div>
          <label htmlFor="email-address" className="sr-only">
            Email address
          </label>
          <input
            id="email-address"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
           className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-500 text-gray-900 text-sm leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"

            placeholder="Email address"
          />
        </div>

        <div className="relative">
          <label htmlFor="password" className="sr-only">
            Password
          </label>
          <input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            required
            ref={passwordInputRef}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-500 text-gray-900 text-sm leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Password"
          />
          <div className="absolute inset-y-0 right-3 flex items-center">
            <button
              type="button"
              className="text-gray-400 hover:text-indigo-600 transition focus:outline-none"
              onClick={togglePasswordVisibility}
              tabIndex={-1}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
            </button>
          </div>
        </div>
      </div>

      <div>
        <button
          type="submit"
          disabled={loading}
          className={`w-full py-3 sm:py-3.5 px-4 text-sm sm:text-base font-semibold rounded-md shadow-md text-white transition duration-200 ${
            loading
              ? 'bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300 cursor-not-allowed'
              : 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:brightness-110'
          } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
        >
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </div>
    </form>
  </div>
</div>

  );
};

export default Login; 
import React, { useState, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import { setCredentials } from '../store/slices/authSlice';
import { clearNotes } from '../store/slices/notesSlice';
import { initializeSocket } from '../services/socket';
import toast from 'react-hot-toast';
import {
  FaEye,
  FaEyeSlash,
  FaEnvelope,
  FaLock,
  FaCheckCircle,
  FaBolt,
  FaUsers,
  FaTags,
  FaArrowRight
} from 'react-icons/fa';

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
      dispatch(setCredentials(data));
      initializeSocket(data.token);
      navigate('/');
      toast.success('Login successful!');
    } catch (error) {
      console.error('Login error:', error);
      toast.error(error.response?.data?.message || error.message || 'Login failed');
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
    <div className="min-h-screen w-full grid lg:grid-cols-12 bg-slate-900 font-sans selection:bg-purple-100 selection:text-purple-900">
      
      {/* Left Brand Showcase Panel (Desktop / Tablet-Landscape) */}
      <div className="hidden lg:flex lg:col-span-5 xl:col-span-5 bg-gradient-to-br from-slate-950 via-indigo-950 to-purple-950 p-10 xl:p-14 flex-col justify-between relative overflow-hidden border-r border-indigo-900/30">
        {/* Ambient background glows */}
        <div className="absolute -top-28 -left-28 w-80 h-80 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-28 -right-28 w-80 h-80 bg-pink-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Brand Header */}
        <div className="relative z-10">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white text-xl font-black shadow-lg shadow-purple-500/25 border border-white/20">
              N
            </div>
            <div>
              <span className="text-2xl font-black text-white tracking-wide">NoteNest</span>
              <span className="ml-2.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-white/10 text-purple-200 border border-white/10 backdrop-blur-md">
                Workspace
              </span>
            </div>
          </div>
        </div>

        {/* Hero Narrative & SaaS Visual Snippet */}
        <div className="relative z-10 my-auto py-8">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-semibold mb-6">
            <FaBolt className="text-amber-400 animate-pulse" size={12} />
            <span>Real-Time Productivity Reimagined</span>
          </div>

          <h1 className="text-3xl xl:text-4xl font-extrabold text-white leading-tight tracking-tight">
            Capture thoughts, organize ideas, and collaborate in real-time.
          </h1>

          <p className="mt-4 text-sm text-slate-300/90 leading-relaxed max-w-md">
            NoteNest brings your team’s notes, nested checklists, tags, and discussions together in one lightning-fast workspace.
          </p>

          {/* Interactive-looking SaaS Preview Card */}
          <div className="mt-8 bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-2xl max-w-md transform hover:scale-[1.01] transition duration-300">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-bold text-white tracking-wide">Sprint Planning 2026</span>
              </div>
              <span className="text-[10px] text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded-full font-bold border border-purple-500/30">
                Live Sync
              </span>
            </div>

            <div className="py-3 space-y-2">
              <div className="flex items-center space-x-2 text-xs text-slate-300">
                <FaCheckCircle className="text-emerald-400" size={13} />
                <span className="line-through text-slate-400">Implement mobile responsive layout</span>
              </div>
              <div className="flex items-center space-x-2 text-xs text-slate-300">
                <FaCheckCircle className="text-emerald-400" size={13} />
                <span>Polish SaaS authentication experience</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-white/10 text-[11px] text-slate-400">
              <div className="flex items-center space-x-1.5">
                <FaTags className="text-purple-400" size={11} />
                <span>#Productivity #Release</span>
              </div>
              <div className="flex items-center -space-x-1.5">
                <span className="w-5 h-5 rounded-full bg-indigo-500 text-[9px] font-bold text-white flex items-center justify-center border border-slate-900">A</span>
                <span className="w-5 h-5 rounded-full bg-purple-500 text-[9px] font-bold text-white flex items-center justify-center border border-slate-900">M</span>
                <span className="w-5 h-5 rounded-full bg-pink-500 text-[9px] font-bold text-white flex items-center justify-center border border-slate-900">K</span>
              </div>
            </div>
          </div>

          {/* Feature highlights list */}
          <div className="mt-8 grid grid-cols-1 gap-3 max-w-md">
            <div className="flex items-center space-x-3 text-xs text-slate-300">
              <div className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center justify-center flex-shrink-0">
                <FaBolt size={11} />
              </div>
              <span>Sub-millisecond WebSocket updates across devices</span>
            </div>
            <div className="flex items-center space-x-3 text-xs text-slate-300">
              <div className="w-6 h-6 rounded-lg bg-purple-500/20 text-purple-300 flex items-center justify-center flex-shrink-0">
                <FaUsers size={11} />
              </div>
              <span>Role-based sharing, comments & version history</span>
            </div>
          </div>
        </div>

        {/* Bottom Trust Stamp */}
        <div className="relative z-10 pt-4 border-t border-white/10 text-xs text-slate-400">
          Crafted for high-performing teams & focused thinkers.
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="col-span-12 lg:col-span-7 xl:col-span-7 bg-slate-50 flex items-center justify-center p-4 sm:p-8 lg:p-12 relative overflow-y-auto">
        {/* Subtle background ambient touch */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-200/40 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-200/30 rounded-full blur-3xl pointer-events-none" />

        <div className="w-full max-w-md relative z-10">

          {/* Mobile-only brand badge (visible on <lg screens) */}
          <div className="lg:hidden flex items-center justify-center space-x-3 mb-8">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white text-lg font-black shadow-md">
              N
            </div>
            <div>
              <span className="text-2xl font-black text-slate-900 tracking-wide">NoteNest</span>
            </div>
          </div>

          {/* Clean SaaS Card Container */}
          <div className="bg-white rounded-3xl p-7 sm:p-10 shadow-xl shadow-slate-200/70 border border-slate-100 transition-all duration-300">
            <div className="mb-8">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Welcome back
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Enter your credentials to access your notes workspace.
              </p>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              {/* Email Input */}
              <div>
                <label
                  htmlFor="email-address"
                  className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2"
                >
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <FaEnvelope size={14} />
                  </div>
                  <input
                    id="email-address"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50/70 hover:bg-slate-50 border border-slate-200 focus:border-purple-600 focus:bg-white rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-4 focus:ring-purple-500/10 transition duration-200"
                    placeholder="name@example.com"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2"
                >
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <FaLock size={14} />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    ref={passwordInputRef}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-11 py-3 bg-slate-50/70 hover:bg-slate-50 border border-slate-200 focus:border-purple-600 focus:bg-white rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-4 focus:ring-purple-500/10 transition duration-200"
                    placeholder="Enter your password"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    <button
                      type="button"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-purple-600 hover:bg-slate-100 transition focus:outline-none"
                      onClick={togglePasswordVisibility}
                      tabIndex={-1}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full py-3.5 px-5 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 hover:brightness-105 active:scale-[0.99] text-white font-bold rounded-xl text-sm shadow-lg shadow-purple-500/25 hover:shadow-purple-500/35 transition duration-200 flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed`}
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign in to NoteNest</span>
                      <FaArrowRight size={13} className="text-white/80" />
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Bottom Switch Link */}
            <div className="mt-8 pt-6 border-t border-slate-100 text-center">
              <p className="text-sm text-slate-500">
                Don't have an account?{' '}
                <Link
                  to="/register"
                  className="font-bold text-purple-600 hover:text-purple-700 transition hover:underline"
                >
                  Create an account
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default Login;
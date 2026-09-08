import React from 'react';
import { FaTimes } from 'react-icons/fa';

const LogoutModal = ({ isOpen, onClose, onConfirm }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl overflow-hidden border border-slate-100 transform transition-all">
                {/* Header: Logout heading on left, Cross icon on right */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                    <h3 className="text-lg font-bold text-slate-900">Logout</h3>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition focus:outline-none cursor-pointer"
                        aria-label="Close"
                    >
                        <FaTimes size={16} />
                    </button>
                </div>

                {/* Body Message */}
                <div className="mb-6">
                    <p className="text-sm font-medium text-slate-600">
                        Are you sure you want to log out of NoteNest?
                    </p>
                </div>

                {/* Buttons */}
                <div className="flex items-center justify-end space-x-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        className="px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-rose-500 to-red-600 hover:brightness-105 active:scale-95 rounded-xl shadow-md shadow-rose-500/20 transition cursor-pointer"
                    >
                        Log out
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LogoutModal;

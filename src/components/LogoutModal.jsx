import React from 'react';
import { FaTimes } from 'react-icons/fa';

const LogoutModal = ({ isOpen, onClose, onConfirm }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl overflow-hidden border border-gray-100 transform transition-all">
                {/* Header: Logout heading on left, Cross icon on right */}
                <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
                    <h3 className="text-lg font-bold text-gray-900">Logout</h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition focus:outline-none"
                        aria-label="Close"
                    >
                        <FaTimes size={16} />
                    </button>
                </div>

                {/* Body Message */}
                <div className="mb-6">
                    <p className="text-sm font-medium text-gray-600">
                        Are you sure you want to log out?
                    </p>
                </div>

                {/* Buttons */}
                <div className="flex items-center justify-end space-x-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition duration-150 focus:outline-none"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        className="px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 rounded-xl shadow transition duration-150 focus:outline-none"
                    >
                        Yes
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LogoutModal;

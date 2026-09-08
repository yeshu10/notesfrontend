import React, { useState, useEffect, useCallback } from 'react';
import { notesAPI } from '../services/api';
import { subscribeToNoteUpdates } from '../services/socket';
import toast from 'react-hot-toast';
import {
    FaHistory,
    FaTimes,
    FaUndo,
    FaUser,
    FaClock,
    FaCheckCircle,
    FaExclamationTriangle,
    FaSpinner
} from 'react-icons/fa';

const VersionHistoryModal = ({ noteId, currentNote, canEdit, onClose, onVersionRestored }) => {
    const [versions, setVersions] = useState([]);
    const [selectedVersion, setSelectedVersion] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isRestoring, setIsRestoring] = useState(false);
    const [showConfirmRestore, setShowConfirmRestore] = useState(false);

    const fetchVersions = useCallback(async (showLoading = true) => {
        try {
            if (showLoading) setLoading(true);
            const data = await notesAPI.getNoteVersions(noteId);
            setVersions(data || []);
            if (data && data.length > 0 && !selectedVersion) {
                setSelectedVersion(data[0]);
            }
        } catch (error) {
            toast.error(error.message || 'Failed to load version history');
        } finally {
            if (showLoading) setLoading(false);
        }
    }, [noteId, selectedVersion]);

    useEffect(() => {
        if (noteId) {
            fetchVersions(true);
        }
    }, [noteId, fetchVersions]);

    // Live update version list when real-time changes or version restorations occur
    useEffect(() => {
        if (!noteId) return;

        const unsubscribe = subscribeToNoteUpdates((data) => {
            if (String(data._id) === String(noteId)) {
                fetchVersions(false);
            }
        });

        return () => {
            unsubscribe();
        };
    }, [noteId, fetchVersions]);

    const handleRestoreConfirm = async () => {
        if (!selectedVersion || !canEdit) return;

        try {
            setIsRestoring(true);
            const updatedNote = await notesAPI.restoreNoteVersion(noteId, selectedVersion._id);
            toast.success(`Restored Version #${selectedVersion.versionNumber}`);
            setShowConfirmRestore(false);
            if (onVersionRestored) {
                onVersionRestored(updatedNote);
            }
            onClose();
        } catch (error) {
            toast.error(error.message || 'Failed to restore version');
        } finally {
            setIsRestoring(false);
        }
    };

    const getBadgeStyle = (changeType) => {
        switch (changeType) {
            case 'created':
                return 'bg-emerald-100 text-emerald-800 border-emerald-200';
            case 'restored':
                return 'bg-purple-100 text-purple-800 border-purple-200';
            default:
                return 'bg-blue-100 text-blue-800 border-blue-200';
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-purple-100 flex flex-col max-h-[90vh] overflow-hidden">

                {/* Header */}
                <div className="px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 border-b border-purple-100 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="w-9 sm:w-10 h-9 sm:h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md flex-shrink-0">
                            <FaHistory size={16} />
                        </div>
                        <div>
                            <h2 className="text-base sm:text-lg font-bold text-gray-900">Version History</h2>
                            <p className="text-[11px] sm:text-xs text-gray-500">View previous revisions and restore note content</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 sm:p-2 text-gray-400 hover:text-gray-700 hover:bg-white/80 rounded-full transition"
                        aria-label="Close modal"
                    >
                        <FaTimes size={16} />
                    </button>
                </div>

                {/* Content Body */}
                {loading ? (
                    <div className="flex-1 flex items-center justify-center p-12 text-gray-500">
                        <FaSpinner className="animate-spin text-purple-600 mr-2" size={24} />
                        <span>Loading version history...</span>
                    </div>
                ) : versions.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-gray-500">
                        <FaHistory className="text-purple-300 text-4xl mb-3" />
                        <p className="text-base font-semibold text-gray-700">No version history available</p>
                        <p className="text-xs text-gray-400 mt-1">Versions are saved automatically when content is updated.</p>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col md:flex-row overflow-hidden divide-y md:divide-y-0 md:divide-x divide-gray-100">

                        {/* Version List Sidebar */}
                        <div className="w-full md:w-80 overflow-y-auto bg-slate-50/70 p-3 space-y-2 max-h-56 md:max-h-none">
                            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-2 py-1">
                                Revisions ({versions.length})
                            </p>
                            {versions.map((ver) => {
                                const isSelected = selectedVersion?._id === ver._id;
                                return (
                                    <div
                                        key={ver._id}
                                        onClick={() => setSelectedVersion(ver)}
                                        className={`p-3.5 rounded-2xl cursor-pointer transition border ${isSelected
                                            ? 'bg-white border-purple-400 shadow-md ring-2 ring-purple-400/20'
                                            : 'bg-white/60 hover:bg-white border-gray-200/80 hover:border-gray-300'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className="font-extrabold text-sm text-indigo-950">
                                                Version #{ver.versionNumber}
                                            </span>
                                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${getBadgeStyle(ver.changeType)}`}>
                                                {ver.changeType}
                                            </span>
                                        </div>

                                        <div className="flex items-center space-x-1.5 text-xs text-gray-500 mb-1">
                                            <FaUser size={10} className="text-purple-500" />
                                            <span className="font-medium truncate">{ver.editedBy?.name || 'Unknown User'}</span>
                                        </div>

                                        <div className="flex items-center space-x-1 text-[11px] text-gray-400">
                                            <FaClock size={9} />
                                            <span>{new Date(ver.createdAt).toLocaleString()}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Selected Version Preview Area */}
                        {selectedVersion && (
                            <div className="flex-1 flex flex-col overflow-hidden bg-white p-4 sm:p-6">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 sm:pb-4 border-b border-gray-100 gap-3">
                                    <div>
                                        <div className="flex items-center space-x-2">
                                            <h3 className="font-bold text-gray-900 text-base sm:text-lg truncate max-w-[200px] sm:max-w-md">
                                                {selectedVersion.title || 'Untitled Note'}
                                            </h3>
                                            <span className="text-xs bg-indigo-50 text-indigo-700 font-bold px-2.5 py-0.5 rounded-full border border-indigo-100">
                                                v{selectedVersion.versionNumber}
                                            </span>
                                        </div>
                                        <p className="text-[11px] sm:text-xs text-gray-400 mt-0.5">
                                            Saved by <span className="font-semibold text-gray-600">{selectedVersion.editedBy?.name || 'User'}</span> on {new Date(selectedVersion.createdAt).toLocaleString()}
                                        </p>
                                    </div>

                                    {/* Action button */}
                                    {canEdit ? (
                                        <button
                                            onClick={() => setShowConfirmRestore(true)}
                                            className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center justify-center space-x-1.5 cursor-pointer hover:shadow-lg flex-shrink-0"
                                        >
                                            <FaUndo size={12} />
                                            <span>Restore This Version</span>
                                        </button>
                                    ) : (
                                        <span className="text-xs bg-amber-50 text-amber-700 px-3 py-1.5 rounded-xl border border-amber-200 font-medium">
                                            View Only (Restoring requires Editor access)
                                        </span>
                                    )}
                                </div>

                                {/* Preview content */}
                                <div className="flex-1 overflow-y-auto mt-4 p-3.5 sm:p-4 bg-slate-50/60 rounded-2xl border border-gray-100 font-sans text-gray-800 leading-relaxed text-xs sm:text-sm whitespace-pre-wrap">
                                    {selectedVersion.content || <span className="text-gray-400 italic">This version has no content.</span>}
                                </div>
                            </div>
                        )}

                    </div>
                )}

                {/* Confirm Restore Dialog Overlay */}
                {showConfirmRestore && (
                    <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in duration-150">
                        <div className="bg-white w-full max-w-md p-5 sm:p-6 rounded-3xl shadow-2xl border border-purple-100 text-center">
                            <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <FaExclamationTriangle size={20} />
                            </div>
                            <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-2">Confirm Version Restore</h3>
                            <p className="text-xs text-gray-600 mb-6">
                                Are you sure you want to restore <span className="font-bold text-purple-700">Version #{selectedVersion?.versionNumber}</span>?
                                Your current note content will be safely preserved in history as a new revision.
                            </p>

                            <div className="flex items-center space-x-3">
                                <button
                                    onClick={() => setShowConfirmRestore(false)}
                                    disabled={isRestoring}
                                    className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleRestoreConfirm}
                                    disabled={isRestoring}
                                    className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow transition flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
                                >
                                    {isRestoring ? (
                                        <>
                                            <FaSpinner className="animate-spin" size={12} />
                                            <span>Restoring...</span>
                                        </>
                                    ) : (
                                        <>
                                            <FaUndo size={12} />
                                            <span>Yes, Restore</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

export default VersionHistoryModal;

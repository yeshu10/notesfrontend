import React, { useState, useEffect } from 'react';
import { remindersAPI } from '../services/api';
import toast from 'react-hot-toast';
import { FaClock, FaTimes, FaCalendarAlt, FaTrash, FaCheck } from 'react-icons/fa';

const ReminderModal = ({ noteId, noteTitle, isOpen, onClose, onReminderUpdated, currentReminder }) => {
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Initialize values from current reminder if present
    useEffect(() => {
        if (currentReminder && currentReminder.reminderAt) {
            const dt = new Date(currentReminder.reminderAt);
            const year = dt.getFullYear();
            const month = String(dt.getMonth() + 1).padStart(2, '0');
            const day = String(dt.getDate()).padStart(2, '0');
            const hours = String(dt.getHours()).padStart(2, '0');
            const minutes = String(dt.getMinutes()).padStart(2, '0');

            setDate(`${year}-${month}-${day}`);
            setTime(`${hours}:${minutes}`);
        } else {
            // Default to tomorrow 09:00 AM
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const year = tomorrow.getFullYear();
            const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
            const day = String(tomorrow.getDate()).padStart(2, '0');

            setDate(`${year}-${month}-${day}`);
            setTime('09:00');
        }
    }, [currentReminder, isOpen]);

    if (!isOpen) return null;

    const handleSave = async (e) => {
        e.preventDefault();

        if (!date || !time) {
            toast.error('Please select both a date and time.');
            return;
        }

        const scheduledTime = new Date(`${date}T${time}:00`);

        if (isNaN(scheduledTime.getTime())) {
            toast.error('Invalid Date or Time selection.');
            return;
        }

        if (scheduledTime <= new Date()) {
            toast.error('Please select a future date and time.');
            return;
        }

        setIsSaving(true);
        try {
            const updated = await remindersAPI.setReminder(noteId, date, time, scheduledTime.toISOString());
            toast.success('Reminder set successfully! ⏰');
            if (onReminderUpdated) onReminderUpdated(updated);
            onClose();
        } catch (error) {
            toast.error(error.message || 'Failed to save reminder');
        } finally {
            setIsSaving(false);
        }
    };

    const handleRemove = async () => {
        setIsDeleting(true);
        try {
            await remindersAPI.deleteReminder(noteId);
            toast.success('Reminder removed');
            if (onReminderUpdated) onReminderUpdated(null);
            onClose();
        } catch (error) {
            toast.error(error.message || 'Failed to remove reminder');
        } finally {
            setIsDeleting(false);
        }
    };

    // Calculate formatted preview string
    let previewString = '';
    if (date && time) {
        const previewDate = new Date(`${date}T${time}:00`);
        if (!isNaN(previewDate.getTime())) {
            previewString = previewDate.toLocaleString([], {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit'
            });
        }
    }

    const todayStr = new Date().toISOString().split('T')[0];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100 animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="px-6 py-5 bg-gradient-to-r from-amber-500 via-purple-600 to-indigo-600 text-white flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                        <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md">
                            <FaClock className="text-white" size={18} />
                        </div>
                        <div>
                            <h3 className="font-extrabold text-base tracking-tight">
                                {currentReminder ? 'Edit Reminder' : 'Set Reminder'}
                            </h3>
                            <p className="text-xs text-white/80 line-clamp-1 font-medium max-w-[220px]">
                                {noteTitle || 'Untitled Note'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-white/20 text-white transition"
                    >
                        <FaTimes size={16} />
                    </button>
                </div>

                {/* Form Body */}
                <form onSubmit={handleSave} className="p-6 space-y-5">
                    {/* Date Field */}
                    <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                            Select Date
                        </label>
                        <div className="relative">
                            <input
                                type="date"
                                min={todayStr}
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition"
                                required
                            />
                        </div>
                    </div>

                    {/* Time Field */}
                    <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                            Select Time
                        </label>
                        <input
                            type="time"
                            value={time}
                            onChange={(e) => setTime(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition"
                            required
                        />
                    </div>

                    {/* Scheduled Preview Box */}
                    {previewString && (
                        <div className="p-4 bg-amber-50/80 border border-amber-200/80 rounded-2xl flex items-center space-x-3">
                            <FaCalendarAlt className="text-amber-600 flex-shrink-0" size={16} />
                            <div>
                                <p className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">
                                    Reminder Scheduled For:
                                </p>
                                <p className="text-xs font-extrabold text-amber-950 mt-0.5">
                                    ⏰ {previewString}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Modal Footer Actions */}
                    <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-3">
                        {currentReminder ? (
                            <button
                                type="button"
                                onClick={handleRemove}
                                disabled={isDeleting || isSaving}
                                className="px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-xl text-xs transition flex items-center space-x-1.5 disabled:opacity-50"
                            >
                                <FaTrash size={12} />
                                <span>{isDeleting ? 'Removing...' : 'Remove'}</span>
                            </button>
                        ) : (
                            <div />
                        )}

                        <div className="flex items-center space-x-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSaving || isDeleting}
                                className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:brightness-110 text-white font-bold rounded-xl text-xs shadow-md transition flex items-center space-x-1.5 disabled:opacity-50"
                            >
                                <FaCheck size={12} />
                                <span>{isSaving ? 'Saving...' : 'Save Reminder'}</span>
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ReminderModal;

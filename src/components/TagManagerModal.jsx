import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { addTagToStore, setTags, setSelectedTag } from '../store/slices/notesSlice';
import { notesAPI } from '../services/api';
import toast from 'react-hot-toast';
import { FaTag, FaPlus, FaTimes, FaTrash, FaCheck } from 'react-icons/fa';

const SUGGESTED_TAGS = ['Work', 'Personal', 'Ideas', 'Study', 'Important', 'Projects', 'Travel'];

const TagManagerModal = ({ isOpen, onClose }) => {
    const dispatch = useDispatch();
    const { tags, selectedTag } = useSelector((state) => state.notes);
    const [newTagName, setNewTagName] = useState('');

    if (!isOpen) return null;

    const handleAddTag = (tagName) => {
        const trimmed = tagName.trim();
        if (!trimmed) return;

        if (tags.includes(trimmed)) {
            toast.error(`Tag "${trimmed}" already exists`);
            return;
        }

        dispatch(addTagToStore(trimmed));
        setNewTagName('');
        toast.success(`Tag "${trimmed}" added!`);
    };

    const handleRemoveTag = (tagToRemove) => {
        const updatedTags = tags.filter(t => t !== tagToRemove);
        dispatch(setTags(updatedTags));
        if (selectedTag === tagToRemove) {
            dispatch(setSelectedTag(''));
        }
        toast.success(`Tag "${tagToRemove}" removed`);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl transform transition-all">
                {/* Header */}
                <div className="flex items-center justify-between border-b pb-3 mb-4">
                    <div className="flex items-center space-x-2 text-indigo-600 font-bold text-lg">
                        <FaTag className="text-pink-500" />
                        <span>Manage Note Tags</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition"
                    >
                        <FaTimes size={18} />
                    </button>
                </div>

                {/* Add Tag Form */}
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        handleAddTag(newTagName);
                    }}
                    className="flex space-x-2 mb-6"
                >
                    <input
                        type="text"
                        value={newTagName}
                        onChange={(e) => setNewTagName(e.target.value)}
                        placeholder="Create custom tag name..."
                        className="flex-grow px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 text-sm"
                    />
                    <button
                        type="submit"
                        className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg text-sm font-semibold hover:brightness-110 flex items-center space-x-1 shadow"
                    >
                        <FaPlus size={12} />
                        <span>Add</span>
                    </button>
                </form>

                {/* Suggested Tags */}
                <div className="mb-6">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                        Quick Suggestions
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {SUGGESTED_TAGS.map((sug) => {
                            const isAdded = tags.includes(sug);
                            return (
                                <button
                                    key={sug}
                                    onClick={() => !isAdded && handleAddTag(sug)}
                                    disabled={isAdded}
                                    className={`px-3 py-1 rounded-full text-xs font-medium transition flex items-center space-x-1 ${isAdded
                                            ? 'bg-purple-100 text-purple-700 cursor-default border border-purple-200'
                                            : 'bg-gray-100 text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 border border-gray-200'
                                        }`}
                                >
                                    <span>{sug}</span>
                                    {isAdded && <FaCheck size={10} className="text-purple-600" />}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Current Active Tags List */}
                <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                        Your Active Tags ({tags.length})
                    </p>
                    {tags.length === 0 ? (
                        <p className="text-sm text-gray-400 italic text-center py-4 bg-gray-50 rounded-lg">
                            No tags created yet. Use suggestions or type one above!
                        </p>
                    ) : (
                        <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                            {tags.map((tag) => (
                                <div
                                    key={tag}
                                    className="flex items-center justify-between p-2.5 bg-gray-50 hover:bg-indigo-50/50 rounded-lg border border-gray-100 transition group"
                                >
                                    <div className="flex items-center space-x-2">
                                        <span className="w-2 h-2 rounded-full bg-gradient-to-r from-pink-400 to-purple-500"></span>
                                        <span className="text-sm font-medium text-gray-800">{tag}</span>
                                    </div>
                                    <button
                                        onClick={() => handleRemoveTag(tag)}
                                        className="text-gray-400 hover:text-red-500 p-1 rounded transition"
                                        title={`Delete tag ${tag}`}
                                    >
                                        <FaTrash size={13} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="mt-6 pt-3 border-t flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-5 py-2 text-sm font-semibold bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TagManagerModal;

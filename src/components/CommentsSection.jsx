import React, { useState, useEffect, useCallback, useRef } from 'react';
import { commentsAPI } from '../services/api';
import { subscribeToComments } from '../services/socket';
import toast from 'react-hot-toast';
import {
  FaComments,
  FaPaperPlane,
  FaReply,
  FaEdit,
  FaTrash,
  FaCheck,
  FaTimes,
  FaLock,
  FaExclamationCircle
} from 'react-icons/fa';

const safeIdEquals = (id1, id2) => {
  if (!id1 || !id2) return false;
  try {
    const s1 = id1._id ? String(id1._id) : String(id1);
    const s2 = id2._id ? String(id2._id) : String(id2);
    return s1 === s2;
  } catch (e) {
    return false;
  }
};

const formatTimeAgo = (dateInput) => {
  if (!dateInput) return '';
  const date = new Date(dateInput);
  const now = new Date();
  const diffInSec = Math.floor((now - date) / 1000);

  if (diffInSec < 60) return 'Just now';
  if (diffInSec < 3600) return `${Math.floor(diffInSec / 60)}m ago`;
  if (diffInSec < 86400) return `${Math.floor(diffInSec / 3600)}h ago`;
  if (diffInSec < 604800) return `${Math.floor(diffInSec / 86400)}d ago`;
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

const CommentsSection = ({
  noteId,
  isOwner,
  userPermission,
  isTrashed,
  currentUser,
  onCommentCountChange
}) => {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newCommentText, setNewCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [replyingToId, setReplyingToId] = useState(null);
  const [replyText, setReplyText] = useState('');

  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');

  const currentUserId = currentUser?._id || currentUser?.id;
  const canComment = !isTrashed && (isOwner || userPermission === 'editor' || userPermission === 'write');

  // Load comments
  const fetchComments = useCallback(async () => {
    if (!noteId) return;
    setLoading(true);
    try {
      const data = await commentsAPI.getComments(noteId);
      const list = data.comments || [];
      setComments(list);
      if (onCommentCountChange) {
        onCommentCountChange(data.totalComments ?? list.filter(c => !c.isDeleted).length);
      }
    } catch (error) {
      console.error('Failed to load comments:', error);
    } finally {
      setLoading(false);
    }
  }, [noteId, onCommentCountChange]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  // Real-time Socket.IO subscription
  useEffect(() => {
    if (!noteId) return;

    const unsubscribe = subscribeToComments({
      onAdded: (newComment) => {
        if (safeIdEquals(newComment.noteId, noteId)) {
          setComments((prev) => {
            const exists = prev.some((c) => safeIdEquals(c._id, newComment._id));
            if (exists) return prev;
            const updated = [...prev, newComment];
            if (onCommentCountChange) {
              onCommentCountChange(updated.filter(c => !c.isDeleted).length);
            }
            return updated;
          });
        }
      },
      onUpdated: (updatedComment) => {
        if (safeIdEquals(updatedComment.noteId, noteId)) {
          setComments((prev) =>
            prev.map((c) =>
              safeIdEquals(c._id, updatedComment._id) ? { ...c, ...updatedComment } : c
            )
          );
        }
      },
      onDeleted: ({ commentId }) => {
        setComments((prev) => {
          const updated = prev.map((c) =>
            safeIdEquals(c._id, commentId)
              ? { ...c, isDeleted: true, content: '[This comment has been deleted]' }
              : c
          );
          if (onCommentCountChange) {
            onCommentCountChange(updated.filter(c => !c.isDeleted).length);
          }
          return updated;
        });
      }
    });

    return () => {
      unsubscribe();
    };
  }, [noteId, onCommentCountChange]);

  // Add top-level comment
  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newCommentText.trim() || !canComment || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const created = await commentsAPI.addComment(noteId, newCommentText.trim());
      setNewCommentText('');
      setComments((prev) => {
        const exists = prev.some((c) => safeIdEquals(c._id, created._id));
        if (exists) return prev;
        const updated = [...prev, created];
        if (onCommentCountChange) {
          onCommentCountChange(updated.filter(c => !c.isDeleted).length);
        }
        return updated;
      });
      toast.success('Comment added');
    } catch (error) {
      toast.error(error.message || 'Failed to add comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reply to comment
  const handleAddReply = async (parentCommentId) => {
    if (!replyText.trim() || !canComment || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const created = await commentsAPI.addComment(noteId, replyText.trim(), parentCommentId);
      setReplyText('');
      setReplyingToId(null);
      setComments((prev) => {
        const exists = prev.some((c) => safeIdEquals(c._id, created._id));
        if (exists) return prev;
        const updated = [...prev, created];
        if (onCommentCountChange) {
          onCommentCountChange(updated.filter(c => !c.isDeleted).length);
        }
        return updated;
      });
      toast.success('Reply posted');
    } catch (error) {
      toast.error(error.message || 'Failed to post reply');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Start editing
  const handleStartEdit = (comment) => {
    setEditingId(comment._id);
    setEditText(comment.content);
  };

  // Save edit
  const handleSaveEdit = async (commentId) => {
    if (!editText.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const updated = await commentsAPI.updateComment(commentId, editText.trim(), noteId);
      setEditingId(null);
      setEditText('');
      setComments((prev) =>
        prev.map((c) => (safeIdEquals(c._id, commentId) ? { ...c, ...updated } : c))
      );
      toast.success('Comment updated');
    } catch (error) {
      toast.error(error.message || 'Failed to update comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete comment
  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return;

    try {
      await commentsAPI.deleteComment(commentId, noteId);
      setComments((prev) => {
        const updated = prev.map((c) =>
          safeIdEquals(c._id, commentId)
            ? { ...c, isDeleted: true, content: '[This comment has been deleted]' }
            : c
        );
        if (onCommentCountChange) {
          onCommentCountChange(updated.filter(c => !c.isDeleted).length);
        }
        return updated;
      });
      toast.success('Comment deleted');
    } catch (error) {
      toast.error(error.message || 'Failed to delete comment');
    }
  };

  // Group comments: top-level comments and replies
  const topLevelComments = comments.filter((c) => !c.parentCommentId);
  const getReplies = (parentId) => comments.filter((c) => safeIdEquals(c.parentCommentId, parentId));
  const activeCount = comments.filter((c) => !c.isDeleted).length;

  const renderSingleComment = (c, isReply = false) => {
    const isAuthor = safeIdEquals(c.userId?._id || c.userId, currentUserId);
    const canEditComment = !c.isDeleted && isAuthor && !isTrashed;
    const canDeleteComment = !c.isDeleted && (isAuthor || isOwner) && !isTrashed;
    const authorName = c.userId?.name || 'Collaborator';
    const initial = authorName.charAt(0).toUpperCase();

    const isCurrentlyEditing = editingId === c._id;
    const isCurrentlyReplying = replyingToId === c._id;

    return (
      <div
        key={c._id}
        className={`group relative rounded-2xl transition-all duration-200 ${
          isReply
            ? 'ml-3 sm:ml-8 mt-3 p-3 sm:p-3.5 bg-slate-50 border border-slate-200/80 shadow-xs'
            : 'mt-4 p-3.5 sm:p-4 bg-white border border-gray-100 shadow-sm hover:border-purple-200'
        }`}
      >
        {/* Author Header */}
        <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
          <div className="flex items-center space-x-2 min-w-0 flex-1">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-xs flex-shrink-0 ${
                isAuthor
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600'
                  : 'bg-gradient-to-r from-pink-500 to-rose-500'
              }`}
            >
              {initial}
            </div>
            <div className="flex items-center space-x-2 truncate min-w-0">
              <span className="text-xs font-bold text-gray-900 truncate max-w-[120px] sm:max-w-[200px]">
                {authorName}
                {isAuthor && <span className="text-[10px] text-purple-600 ml-1 font-semibold">(You)</span>}
              </span>
              <span className="text-[10px] text-gray-400 font-medium flex-shrink-0">
                {formatTimeAgo(c.createdAt)}
              </span>
              {c.isEdited && !c.isDeleted && (
                <span className="text-[9px] text-gray-400 italic bg-gray-100 px-1.5 py-0.5 rounded flex-shrink-0">
                  Edited
                </span>
              )}
            </div>
          </div>

          {/* Action Menu (Reply, Edit, Delete) */}
          <div className="flex items-center space-x-1 opacity-80 group-hover:opacity-100 transition">
            {!c.isDeleted && canComment && !isReply && (
              <button
                onClick={() => {
                  setReplyingToId(isCurrentlyReplying ? null : c._id);
                  setReplyText('');
                }}
                className={`p-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1 transition ${
                  isCurrentlyReplying
                    ? 'bg-purple-100 text-purple-700'
                    : 'text-gray-400 hover:text-purple-600 hover:bg-purple-50'
                }`}
                title="Reply"
              >
                <FaReply size={10} />
                <span className="text-[10px] hidden sm:inline">Reply</span>
              </button>
            )}

            {canEditComment && !isCurrentlyEditing && (
              <button
                onClick={() => handleStartEdit(c)}
                className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                title="Edit comment"
              >
                <FaEdit size={11} />
              </button>
            )}

            {canDeleteComment && (
              <button
                onClick={() => handleDeleteComment(c._id)}
                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                title="Delete comment"
              >
                <FaTrash size={10} />
              </button>
            )}
          </div>
        </div>

        {/* Comment Content / Edit Mode */}
        {isCurrentlyEditing ? (
          <div className="mt-2 space-y-2">
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="w-full text-xs p-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
              rows={2}
              autoFocus
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  setEditingId(null);
                  setEditText('');
                }}
                className="px-2.5 py-1 text-xs text-gray-500 hover:bg-gray-100 rounded-lg font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSaveEdit(c._id)}
                disabled={isSubmitting || !editText.trim()}
                className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold shadow-xs disabled:opacity-50 flex items-center space-x-1"
              >
                <FaCheck size={10} />
                <span>Save</span>
              </button>
            </div>
          </div>
        ) : (
          <div
            className={`text-xs leading-relaxed ${
              c.isDeleted ? 'text-gray-400 italic py-1' : 'text-gray-800 font-normal whitespace-pre-wrap'
            }`}
          >
            {c.content}
          </div>
        )}

        {/* In-place Reply Input */}
        {isCurrentlyReplying && (
          <div className="mt-3 pt-3 border-t border-purple-100 animate-in fade-in duration-150">
            <div className="flex items-start space-x-2">
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={`Reply to ${authorName}...`}
                rows={2}
                className="flex-1 p-2.5 text-xs bg-white border border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-inner resize-none"
                autoFocus
              />
              <div className="flex flex-col space-y-1">
                <button
                  onClick={() => handleAddReply(c._id)}
                  disabled={isSubmitting || !replyText.trim()}
                  className="px-3 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl text-xs font-bold shadow hover:brightness-110 disabled:opacity-50 transition flex items-center space-x-1"
                >
                  <FaPaperPlane size={10} />
                  <span>Send</span>
                </button>
                <button
                  onClick={() => {
                    setReplyingToId(null);
                    setReplyText('');
                  }}
                  className="px-3 py-1 text-[10px] text-gray-500 hover:text-gray-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Nested Replies */}
        {!isReply && (
          <div className="space-y-1">
            {getReplies(c._id).map((r) => renderSingleComment(r, true))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-3xl p-4 sm:p-6 shadow-md border border-gray-200 mt-6 font-sans">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-4 border-b border-gray-100">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center text-sm shadow-inner">
            <FaComments />
          </div>
          <h3 className="text-sm sm:text-base font-extrabold text-gray-900 tracking-tight">
            Discussion & Comments
          </h3>
          <span className="px-2.5 py-0.5 bg-purple-100 text-purple-800 rounded-full text-xs font-extrabold shadow-xs">
            {activeCount}
          </span>
        </div>

        {/* Permission / Status notification */}
        {isTrashed ? (
          <span className="text-xs text-red-600 font-semibold flex items-center space-x-1 bg-red-50 px-2.5 py-1 rounded-lg border border-red-200 w-fit">
            <FaExclamationCircle size={11} />
            <span>Note in Trash (Comments frozen)</span>
          </span>
        ) : !canComment ? (
          <span className="text-xs text-amber-700 font-semibold flex items-center space-x-1 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 w-fit">
            <FaLock size={10} />
            <span>View Only</span>
          </span>
        ) : null}
      </div>

      {/* Main Comment Input Box */}
      {canComment ? (
        <form onSubmit={handleAddComment} className="mt-4 mb-6">
          <div className="relative">
            <textarea
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              placeholder="Write a comment or question without altering note content..."
              rows={2}
              className="w-full p-3.5 pr-24 text-xs sm:text-sm bg-slate-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white shadow-inner resize-none leading-relaxed"
            />
            <button
              type="submit"
              disabled={isSubmitting || !newCommentText.trim()}
              className="absolute right-2.5 bottom-3 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:brightness-110 text-white rounded-xl text-xs font-bold shadow-md transition disabled:opacity-40 flex items-center space-x-1.5 cursor-pointer"
            >
              <FaPaperPlane size={11} />
              <span>Comment</span>
            </button>
          </div>
        </form>
      ) : (
        <div className="mt-4 mb-5 p-3.5 bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-center text-xs text-gray-500">
          {isTrashed
            ? 'This note is in Trash. Restore it to participate in comments.'
            : 'You have viewing access. Only owners and editors can post comments.'}
        </div>
      )}

      {/* Comments List */}
      {loading ? (
        <div className="py-8 text-center text-xs text-gray-400 animate-pulse space-y-3">
          <div className="h-12 bg-gray-100 rounded-xl w-full" />
          <div className="h-12 bg-gray-100 rounded-xl w-5/6 mx-auto" />
        </div>
      ) : topLevelComments.length === 0 ? (
        <div className="py-8 text-center text-gray-400">
          <p className="text-xs font-medium">No comments yet.</p>
          <p className="text-[11px] text-gray-400 mt-1">
            {canComment ? 'Be the first to start the discussion!' : 'No discussion for this note yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {topLevelComments.map((c) => renderSingleComment(c, false))}
        </div>
      )}
    </div>
  );
};

export default CommentsSection;

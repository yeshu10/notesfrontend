import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  FaPaperclip,
  FaUpload,
  FaTrash,
  FaDownload,
  FaEye,
  FaFilePdf,
  FaFileWord,
  FaFileAlt,
  FaImage,
  FaTimes,
  FaFile,
  FaSpinner,
  FaExclamationTriangle,
} from 'react-icons/fa';
import { attachmentsAPI } from '../services/api';
import { subscribeToAttachments } from '../services/socket';
import toast from 'react-hot-toast';

// ─── Constants (mirrors backend config/gridfs.js) ────────────────────────────

const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const ALLOWED_EXTENSIONS = new Set([
  'jpg', 'jpeg', 'png', 'webp', 'gif', 'svg',
  'pdf', 'txt', 'doc', 'docx',
]);

const IMAGE_MIME_PREFIXES = 'image/';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatSize = (bytes) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getFileIcon = (mimeType) => {
  if (!mimeType) return <FaFile className="text-gray-400" />;
  if (mimeType.startsWith('image/')) return <FaImage className="text-blue-500" />;
  if (mimeType === 'application/pdf') return <FaFilePdf className="text-red-500" />;
  if (
    mimeType === 'application/msword' ||
    mimeType.includes('wordprocessingml')
  )
    return <FaFileWord className="text-blue-600" />;
  if (mimeType === 'text/plain') return <FaFileAlt className="text-gray-500" />;
  return <FaFile className="text-gray-400" />;
};

const validateFile = (file) => {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return `"${file.name}" exceeds the maximum allowed size of ${MAX_FILE_SIZE_MB} MB`;
  }
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return `"${file.name}" — unsupported file type. Allowed: jpg, png, webp, gif, svg, pdf, txt, doc, docx`;
  }
  return null;
};

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * AttachmentsSection — self-contained panel for uploading, listing,
 * previewing, downloading, and deleting note attachments.
 *
 * Props:
 *   noteId        {string}  – the note's MongoDB _id
 *   userPermission {string} – 'owner' | 'editor' | 'viewer'
 *   isOwner       {boolean}
 *   isTrashed     {boolean}
 */
const AttachmentsSection = ({ noteId, userPermission, isOwner, isTrashed }) => {
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadingName, setUploadingName] = useState('');

  const [isDragging, setIsDragging] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // { [attachmentId]: blobURL } — only for images
  const [imagePreviews, setImagePreviews] = useState({});
  const blobUrlsRef = useRef({});

  // Full-screen preview modal
  const [previewModal, setPreviewModal] = useState(null);

  const fileInputRef = useRef(null);

  const canUpload =
    !isTrashed && (isOwner || userPermission === 'editor' || userPermission === 'write');
  const canDelete =
    !isTrashed && (isOwner || userPermission === 'editor' || userPermission === 'write');

  // ── Fetch attachments ──────────────────────────────────────────────────────

  const fetchAttachments = useCallback(async () => {
    if (!noteId) return;
    try {
      setLoading(true);
      setLoadError(null);
      const data = await attachmentsAPI.getAttachments(noteId);
      setAttachments(data);
    } catch (err) {
      setLoadError('Failed to load attachments');
    } finally {
      setLoading(false);
    }
  }, [noteId]);

  useEffect(() => {
    fetchAttachments();
  }, [fetchAttachments]);

  // ── Load image previews as authenticated Blobs ────────────────────────────

  useEffect(() => {
    let cancelled = false;
    const loadPreviews = async () => {
      for (const att of attachments) {
        if (
          att.mimeType?.startsWith(IMAGE_MIME_PREFIXES) &&
          !blobUrlsRef.current[att._id]
        ) {
          try {
            const blob = await attachmentsAPI.fetchAttachmentBlob(att._id);
            if (cancelled) return;
            const url = URL.createObjectURL(blob);
            blobUrlsRef.current[att._id] = url;
            setImagePreviews((prev) => ({ ...prev, [att._id]: url }));
          } catch {
            // Preview failed silently — show icon fallback instead
          }
        }
      }
    };
    if (attachments.length > 0) loadPreviews();
    return () => { cancelled = true; };
  }, [attachments]);

  // ── Revoke all blob URLs on unmount ──────────────────────────────────────

  useEffect(() => {
    return () => {
      Object.values(blobUrlsRef.current).forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  // ── Real-time socket subscription ────────────────────────────────────────

  useEffect(() => {
    if (!noteId) return;
    const unsubscribe = subscribeToAttachments({
      onAdded: ({ attachment, noteId: eventNoteId }) => {
        if (String(eventNoteId) !== String(noteId)) return;
        setAttachments((prev) => {
          // Deduplicate — may already be added by the uploader's optimistic update
          if (prev.some((a) => a._id === attachment._id)) return prev;
          return [...prev, attachment];
        });
      },
      onDeleted: ({ attachmentId, noteId: eventNoteId }) => {
        if (String(eventNoteId) !== String(noteId)) return;
        setAttachments((prev) => prev.filter((a) => a._id !== attachmentId));
        if (blobUrlsRef.current[attachmentId]) {
          URL.revokeObjectURL(blobUrlsRef.current[attachmentId]);
          delete blobUrlsRef.current[attachmentId];
          setImagePreviews((prev) => {
            const n = { ...prev };
            delete n[attachmentId];
            return n;
          });
        }
      },
    });
    return unsubscribe;
  }, [noteId]);

  // ── Upload handler ────────────────────────────────────────────────────────

  const handleUploadFiles = useCallback(
    async (files) => {
      if (!files || files.length === 0) return;

      for (const file of files) {
        const validationError = validateFile(file);
        if (validationError) {
          toast.error(validationError);
          continue;
        }

        setUploading(true);
        setUploadProgress(0);
        setUploadingName(file.name);

        try {
          const attachment = await attachmentsAPI.uploadAttachment(
            noteId,
            file,
            (pct) => setUploadProgress(pct)
          );
          // Optimistic add (socket event also fires but deduplicates)
          setAttachments((prev) =>
            prev.some((a) => a._id === attachment._id) ? prev : [...prev, attachment]
          );
          toast.success(`"${file.name}" uploaded`);

          // Load image preview immediately
          if (attachment.mimeType?.startsWith(IMAGE_MIME_PREFIXES)) {
            try {
              const blob = await attachmentsAPI.fetchAttachmentBlob(attachment._id);
              const url = URL.createObjectURL(blob);
              blobUrlsRef.current[attachment._id] = url;
              setImagePreviews((prev) => ({ ...prev, [attachment._id]: url }));
            } catch {
              // Preview load failure is non-critical
            }
          }
        } catch (err) {
          toast.error(err.message || 'Upload failed. Please try again.');
        } finally {
          setUploading(false);
          setUploadProgress(0);
          setUploadingName('');
        }
      }

      // Reset file input so the same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    [noteId]
  );

  // ── Download handler ──────────────────────────────────────────────────────

  const handleDownload = useCallback(async (attachment) => {
    try {
      const blob = await attachmentsAPI.fetchAttachmentBlob(attachment._id);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = attachment.originalName;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to download file');
    }
  }, []);

  // ── Delete handler ────────────────────────────────────────────────────────

  const handleDelete = useCallback(
    async (attachment) => {
      if (
        !window.confirm(
          `Delete "${attachment.originalName}"?\nThis action cannot be undone.`
        )
      )
        return;

      setDeletingId(attachment._id);
      try {
        await attachmentsAPI.deleteAttachment(attachment._id);
        setAttachments((prev) => prev.filter((a) => a._id !== attachment._id));

        // Revoke blob URL if cached
        if (blobUrlsRef.current[attachment._id]) {
          URL.revokeObjectURL(blobUrlsRef.current[attachment._id]);
          delete blobUrlsRef.current[attachment._id];
          setImagePreviews((prev) => {
            const n = { ...prev };
            delete n[attachment._id];
            return n;
          });
        }
        if (previewModal?._id === attachment._id) setPreviewModal(null);
        toast.success('Attachment deleted');
      } catch (err) {
        toast.error(err.message || 'Failed to delete attachment');
      } finally {
        setDeletingId(null);
      }
    },
    [previewModal]
  );

  // ── Drag and drop ─────────────────────────────────────────────────────────

  const handleDragOver = (e) => {
    e.preventDefault();
    if (canUpload && !uploading) setIsDragging(true);
  };
  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (!canUpload || uploading) return;
    const files = Array.from(e.dataTransfer.files);
    handleUploadFiles(files);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="bg-white rounded-3xl shadow-lg border border-gray-200 overflow-hidden mt-4">

      {/* ── Section header ─────────────────────────────────────────────────── */}
      <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <FaPaperclip className="text-purple-600" size={13} />
          <h3 className="text-xs sm:text-sm font-extrabold text-gray-800 uppercase tracking-wider">
            Attachments
          </h3>
          {attachments.length > 0 && (
            <span className="px-1.5 py-0.5 bg-purple-100 text-purple-800 text-[10px] rounded-full font-bold">
              {attachments.length}
            </span>
          )}
        </div>

        {canUpload && (
          <button
            onClick={() => !uploading && fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:brightness-110 text-white text-xs font-bold rounded-xl transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            title="Add attachment"
          >
            <FaUpload size={10} />
            <span>Add Attachment</span>
          </button>
        )}

        {/* Hidden file input — accepts all supported extensions */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".jpg,.jpeg,.png,.webp,.gif,.svg,.pdf,.txt,.doc,.docx"
          className="hidden"
          onChange={(e) => handleUploadFiles(Array.from(e.target.files))}
        />
      </div>

      {/* ── Main content ─────────────────────────────────────────────────────── */}
      <div className="p-4 sm:p-6">

        {/* Upload progress bar */}
        {uploading && (
          <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-xl">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center space-x-2">
                <FaSpinner className="animate-spin text-purple-600" size={11} />
                <span className="text-xs font-bold text-purple-700 truncate max-w-[200px]">
                  Uploading {uploadingName && `"${uploadingName}"`}…
                </span>
              </div>
              <span className="text-xs font-extrabold text-purple-700">
                {uploadProgress}%
              </span>
            </div>
            <div className="w-full bg-purple-200 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-purple-500 to-indigo-500 h-1.5 rounded-full transition-all duration-200"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Drag-and-drop zone (only if user can upload) */}
        {canUpload && (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !uploading && fileInputRef.current?.click()}
            className={`mb-4 border-2 border-dashed rounded-xl px-4 py-5 text-center cursor-pointer select-none transition ${
              isDragging
                ? 'border-purple-500 bg-purple-50 scale-[1.01]'
                : uploading
                ? 'border-gray-200 opacity-60 cursor-not-allowed'
                : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50/40'
            }`}
          >
            <FaUpload
              className={`mx-auto mb-1.5 ${
                isDragging ? 'text-purple-600' : 'text-gray-300'
              }`}
              size={20}
            />
            <p
              className={`text-xs font-semibold ${
                isDragging ? 'text-purple-700' : 'text-gray-400'
              }`}
            >
              {isDragging ? 'Drop files to upload' : 'Drag & drop or click to select files'}
            </p>
            <p className="text-[10px] text-gray-400 mt-0.5 font-medium">
              JPEG · PNG · WEBP · GIF · SVG · PDF · TXT · DOC · DOCX &nbsp;·&nbsp; Max {MAX_FILE_SIZE_MB} MB
            </p>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-10">
            <FaSpinner className="animate-spin text-purple-500 mr-2.5" size={16} />
            <span className="text-sm text-gray-400 font-medium">Loading attachments…</span>
          </div>
        )}

        {/* Load error */}
        {!loading && loadError && (
          <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-medium">
            <FaExclamationTriangle size={13} />
            <span>{loadError}</span>
            <button
              onClick={fetchAttachments}
              className="ml-auto text-xs underline font-bold hover:text-red-900"
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty state */}
        {!loading && !loadError && attachments.length === 0 && !uploading && (
          <div className="text-center py-10">
            <FaPaperclip className="mx-auto text-gray-200 mb-2.5" size={32} />
            <p className="text-sm text-gray-400 font-semibold">No attachments yet</p>
            {canUpload && (
              <p className="text-xs text-gray-400 mt-1">
                Upload files to attach them to this note
              </p>
            )}
            {!canUpload && (
              <p className="text-xs text-gray-400 mt-1">
                No files have been attached to this note
              </p>
            )}
          </div>
        )}

        {/* Attachments list */}
        {!loading && !loadError && attachments.length > 0 && (
          <div className="space-y-2.5">
            {attachments.map((attachment) => {
              const isImage = attachment.mimeType?.startsWith(IMAGE_MIME_PREFIXES);
              const previewUrl = imagePreviews[attachment._id];
              const isDeleting = deletingId === attachment._id;

              return (
                <div
                  key={attachment._id}
                  className="group border border-gray-100 hover:border-purple-200 rounded-2xl overflow-hidden transition-all duration-150 shadow-sm hover:shadow-md"
                >
                  {/* Image thumbnail */}
                  {isImage && previewUrl && (
                    <div
                      className="relative cursor-pointer overflow-hidden bg-gray-50"
                      onClick={() => setPreviewModal(attachment)}
                    >
                      <img
                        src={previewUrl}
                        alt={attachment.originalName}
                        className="w-full max-h-48 object-cover object-center group-hover:scale-[1.02] transition-transform duration-200"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 flex items-center justify-center transition-all duration-150">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1.5 bg-black/60 text-white text-xs font-bold px-3 py-1.5 rounded-full">
                          <FaEye size={11} />
                          <span>Click to preview</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* File info row */}
                  <div className="p-3 flex items-center justify-between gap-3 bg-white">
                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                      <div className="flex-shrink-0 text-lg">
                        {getFileIcon(attachment.mimeType)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p
                          className="text-sm font-semibold text-gray-800 truncate leading-snug"
                          title={attachment.originalName}
                        >
                          {attachment.originalName}
                        </p>
                        <div className="flex items-center space-x-1.5 text-[10px] text-gray-400 font-medium mt-0.5">
                          <span>{formatSize(attachment.fileSize)}</span>
                          {attachment.uploadedBy?.name && (
                            <>
                              <span className="text-gray-200">·</span>
                              <span className="truncate">{attachment.uploadedBy.name}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center space-x-0.5 flex-shrink-0">
                      {/* Preview (images only) */}
                      {isImage && previewUrl && (
                        <button
                          onClick={() => setPreviewModal(attachment)}
                          className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition"
                          title="Full preview"
                        >
                          <FaEye size={12} />
                        </button>
                      )}
                      {/* Download */}
                      <button
                        onClick={() => handleDownload(attachment)}
                        className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition"
                        title="Download"
                      >
                        <FaDownload size={12} />
                      </button>
                      {/* Delete (owner / editor only) */}
                      {canDelete && (
                        <button
                          onClick={() => handleDelete(attachment)}
                          disabled={isDeleting}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition disabled:opacity-50"
                          title="Delete attachment"
                        >
                          {isDeleting ? (
                            <FaSpinner className="animate-spin" size={12} />
                          ) : (
                            <FaTrash size={12} />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Full-screen image preview modal ─────────────────────────────────── */}
      {previewModal && (
        <div
          className="fixed inset-0 z-[60] bg-black/85 flex flex-col items-center justify-center p-3 sm:p-4 backdrop-blur-sm"
          onClick={() => setPreviewModal(null)}
        >
          <div
            className="relative max-w-5xl max-h-[90vh] w-full flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setPreviewModal(null)}
              className="absolute top-3 right-3 sm:-top-10 sm:right-0 text-white/80 hover:text-white bg-black/40 sm:bg-transparent rounded-full transition p-2 z-10"
              title="Close preview"
              aria-label="Close preview"
            >
              <FaTimes size={20} />
            </button>

            {/* Image */}
            <img
              src={imagePreviews[previewModal._id]}
              alt={previewModal.originalName}
              className="max-w-full max-h-[75vh] sm:max-h-[80vh] object-contain rounded-2xl shadow-2xl"
            />

            {/* Caption + actions */}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2.5 bg-white/10 backdrop-blur-sm rounded-2xl px-4 sm:px-5 py-2.5 w-full max-w-lg">
              <div className="min-w-0 flex-1">
                <p className="text-white text-xs sm:text-sm font-semibold truncate">{previewModal.originalName}</p>
                <p className="text-white/60 text-[10px] sm:text-[11px]">{formatSize(previewModal.fileSize)}</p>
              </div>
              <div className="flex items-center space-x-2 flex-shrink-0">
                <button
                  onClick={() => handleDownload(previewModal)}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-bold rounded-xl transition"
                >
                  <FaDownload size={11} />
                  <span>Download</span>
                </button>
                {canDelete && (
                  <button
                    onClick={() => handleDelete(previewModal)}
                    disabled={!!deletingId}
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-red-500/80 hover:bg-red-500 text-white text-xs font-bold rounded-xl transition disabled:opacity-50"
                  >
                    {deletingId === previewModal._id ? (
                      <FaSpinner className="animate-spin" size={11} />
                    ) : (
                      <FaTrash size={11} />
                    )}
                    <span>Delete</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttachmentsSection;

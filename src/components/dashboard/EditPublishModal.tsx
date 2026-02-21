'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    Copy,
    Check,
    Loader2,
    Send,
    Edit3,
    Save,
    Twitter,
    Linkedin,
    AlertCircle
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface Post {
    id: string;
    platform: string;
    scheduled_date: string;
    content: string;
    format: string;
    status: string;
}

interface EditPublishModalProps {
    post: Post | null;
    onClose: () => void;
    onContentUpdate: (postId: string, newContent: string) => void;
    onPublishSuccess: (postId: string) => void;
}

export default function EditPublishModal({
    post,
    onClose,
    onContentUpdate,
    onPublishSuccess
}: EditPublishModalProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [editedContent, setEditedContent] = useState(post?.content || '');
    const [isSaving, setIsSaving] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showConfirmPublish, setShowConfirmPublish] = useState(false);

    if (!post) return null;

    const PlatformIcon = post.platform.toLowerCase() === 'x' ? Twitter : Linkedin;
    const isPosted = post.status === 'posted';

    const handleCopy = async () => {
        await navigator.clipboard.writeText(editedContent);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleSave = async () => {
        setIsSaving(true);
        setError(null);
        try {
            const response = await fetch(`/api/posts/${post.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: editedContent }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to save');
            }

            onContentUpdate(post.id, editedContent);
            setIsEditing(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save');
        } finally {
            setIsSaving(false);
        }
    };

    const handlePublish = async () => {
        setIsPublishing(true);
        setError(null);
        try {
            // First save any pending edits
            if (editedContent !== post.content) {
                await fetch(`/api/posts/${post.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ content: editedContent }),
                });
            }

            // Then publish
            const response = await fetch(`/api/posts/${post.id}/publish`, {
                method: 'POST',
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to publish');
            }

            onPublishSuccess(post.id);
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to publish');
            setShowConfirmPublish(false);
        } finally {
            setIsPublishing(false);
        }
    };

    const startEdit = () => {
        setEditedContent(post.content);
        setIsEditing(true);
    };

    const cancelEdit = () => {
        setEditedContent(post.content);
        setIsEditing(false);
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            >
                <motion.div
                    initial={{ scale: 0.95, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.95, y: 20 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-[var(--card)] rounded-2xl border border-[var(--border)] max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl"
                >
                    {/* Header */}
                    <div className="p-5 border-b border-[var(--border)] flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${post.platform.toLowerCase() === 'x'
                                ? 'bg-black text-white dark:bg-white dark:text-black'
                                : 'bg-[#0077B5] text-white'
                                }`}>
                                <PlatformIcon className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-semibold">
                                    {format(parseISO(post.scheduled_date), 'EEEE, MMM d')}
                                </h3>
                                <p className="text-sm text-[var(--foreground-muted)]">
                                    {format(parseISO(post.scheduled_date), 'h:mm a')} • {post.format}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-[var(--background-secondary)] rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Content Area */}
                    <div className="p-5 overflow-y-auto max-h-[calc(90vh-280px)]">
                        {/* Error Banner */}
                        {error && (
                            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-red-500 text-sm">
                                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        {post.format === 'carousel' ? (
                            <div className="flex flex-col items-center justify-center p-8 bg-[var(--background-secondary)] rounded-xl border border-[var(--border)] border-dashed">
                                <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
                                    <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-semibold mb-2">Carousel Post</h3>
                                <p className="text-[var(--foreground-muted)] text-center mb-6 max-w-sm text-sm">
                                    This is a visual carousel post.
                                    Click below to view the slides, edit content, or change the design style.
                                </p>
                                <a
                                    href={`/dashboard/carousels/${post.id}`}
                                    className="px-6 py-3 bg-[var(--primary)] text-white rounded-xl font-medium hover:opacity-90 transition-all flex items-center gap-2"
                                >
                                    View Slides
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                    </svg>
                                </a>
                            </div>
                        ) : isEditing ? (
                            <textarea
                                value={editedContent}
                                onChange={(e) => setEditedContent(e.target.value)}
                                className="w-full h-64 p-4 bg-[var(--background-secondary)] rounded-xl text-sm leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                                placeholder="Write your post content..."
                            />
                        ) : (
                            <div className="bg-[var(--background-secondary)] rounded-xl p-5 whitespace-pre-wrap text-sm leading-relaxed">
                                {editedContent || post.content}
                            </div>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div className="p-5 border-t border-[var(--border)] space-y-3">
                        {/* Top row: Edit/Save + Cancel or Done */}
                        <div className="flex gap-2">
                            {isEditing ? (
                                <>
                                    <button
                                        onClick={cancelEdit}
                                        className="flex-1 py-3 rounded-xl font-medium bg-[var(--background-secondary)] hover:bg-[var(--border)] transition-all flex items-center justify-center gap-2"
                                    >
                                        <X className="w-4 h-4" />
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        disabled={isSaving}
                                        className="flex-1 py-3 rounded-xl font-medium bg-[var(--primary)] text-white hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        {isSaving ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Save className="w-4 h-4" />
                                        )}
                                        Save
                                    </button>
                                </>
                            ) : (
                                <>
                                    {post.format !== 'carousel' && (
                                        <button
                                            onClick={startEdit}
                                            disabled={isPosted}
                                            className="flex-1 py-3 rounded-xl font-medium bg-[var(--background-secondary)] hover:bg-[var(--border)] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                        >
                                            <Edit3 className="w-4 h-4" />
                                            Edit
                                        </button>
                                    )}
                                    {post.platform.toLowerCase() === 'x' && !isPosted && (
                                        <button
                                            onClick={async () => {
                                                // Mark as posted manually
                                                try {
                                                    await fetch(`/api/posts/${post.id}/publish`, { method: 'POST' }); // Re-use publish endpoint which marks as posted
                                                    onPublishSuccess(post.id);
                                                    onClose();
                                                } catch (e) { alert('Failed to mark as posted'); }
                                            }}
                                            className="flex-1 py-3 rounded-xl font-medium bg-green-500/10 hover:bg-green-500/20 text-green-700 dark:text-green-400 transition-all flex items-center justify-center gap-2"
                                            title="Mark as posted after you publish manually"
                                        >
                                            <Check className="w-4 h-4" />
                                            Done
                                        </button>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Bottom Action: Copy (Full Width) for X, or Publish for LinkedIn */}
                        {!isPosted && !isEditing && (
                            post.platform.toLowerCase() === 'x' ? (
                                // X (Twitter) Manual Flow - Copy Button Full Width
                                <button
                                    onClick={handleCopy}
                                    className="w-full py-4 rounded-xl font-semibold bg-black text-white dark:bg-white dark:text-black hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-lg"
                                >
                                    {copied ? (
                                        <>
                                            <Check className="w-5 h-5 text-green-500" />
                                            Copied!
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="w-5 h-5" />
                                            Copy & Open X
                                        </>
                                    )}
                                </button>
                            ) : (
                                // LinkedIn Auto-Publish Flow
                                showConfirmPublish ? (
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setShowConfirmPublish(false)}
                                            className="flex-1 py-4 rounded-xl font-semibold bg-[var(--background-secondary)] hover:bg-[var(--border)] transition-all"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handlePublish}
                                            disabled={isPublishing}
                                            className="flex-1 py-4 rounded-xl font-semibold bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                        >
                                            {isPublishing ? (
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                            ) : (
                                                <>
                                                    <Send className="w-5 h-5" />
                                                    Confirm
                                                </>
                                            )}
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setShowConfirmPublish(true)}
                                        className="w-full py-4 rounded-xl font-semibold bg-[#0A66C2] text-white hover:bg-[#004182] transition-all flex items-center justify-center gap-2 shadow-lg"
                                    >
                                        <Send className="w-5 h-5" />
                                        Post Now
                                    </button>
                                )
                            )
                        )}

                        {isPosted && (
                            <div className="text-center py-3 text-emerald-500 font-medium flex items-center justify-center gap-2">
                                <Check className="w-5 h-5" />
                                Published
                            </div>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

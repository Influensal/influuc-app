'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    Copy,
    Check,
    Loader2,
    Send,
    RefreshCw,
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
    regenerated?: boolean;
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
    const [isRegenerating, setIsRegenerating] = useState(false);
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showConfirmPublish, setShowConfirmPublish] = useState(false);

    if (!post) return null;

    const PlatformIcon = post.platform.toLowerCase() === 'x' ? Twitter : Linkedin;
    const isPosted = post.status === 'posted';
    const hasRegenerated = post.regenerated === true;

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

    const handleRegenerate = async () => {
        if (hasRegenerated) {
            setError('This post has already been regenerated. You can only regenerate once per post.');
            return;
        }

        setIsRegenerating(true);
        setError(null);
        try {
            const response = await fetch(`/api/posts/${post.id}/regenerate`, {
                method: 'POST',
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || data.message || 'Failed to regenerate');
            }

            // Update content with new generated content
            setEditedContent(data.content);
            onContentUpdate(post.id, data.content);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to regenerate');
        } finally {
            setIsRegenerating(false);
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

                        {isEditing ? (
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
                        {/* Top row: Edit/Save, Copy, Regenerate */}
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
                                    <button
                                        onClick={startEdit}
                                        disabled={isPosted}
                                        className="flex-1 py-3 rounded-xl font-medium bg-[var(--background-secondary)] hover:bg-[var(--border)] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        <Edit3 className="w-4 h-4" />
                                        Edit
                                    </button>
                                    <button
                                        onClick={handleCopy}
                                        className="flex-1 py-3 rounded-xl font-medium bg-[var(--background-secondary)] hover:bg-[var(--border)] transition-all flex items-center justify-center gap-2"
                                    >
                                        {copied ? (
                                            <>
                                                <Check className="w-4 h-4 text-green-500" />
                                                Copied!
                                            </>
                                        ) : (
                                            <>
                                                <Copy className="w-4 h-4" />
                                                Copy
                                            </>
                                        )}
                                    </button>
                                    <button
                                        onClick={handleRegenerate}
                                        disabled={isPosted || isRegenerating || hasRegenerated}
                                        title={hasRegenerated ? 'Already regenerated once' : 'Regenerate content'}
                                        className="flex-1 py-3 rounded-xl font-medium bg-[var(--background-secondary)] hover:bg-[var(--border)] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        {isRegenerating ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <RefreshCw className={`w-4 h-4 ${hasRegenerated ? 'text-[var(--foreground-muted)]' : ''}`} />
                                        )}
                                        {hasRegenerated ? 'Used' : 'Regen'}
                                    </button>
                                </>
                            )}
                        </div>

                        {/* Bottom row: Publish */}
                        {!isPosted && !isEditing && (
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
                                                Confirm & Publish Now
                                            </>
                                        )}
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setShowConfirmPublish(true)}
                                    className="w-full py-4 rounded-xl font-semibold bg-white text-black hover:bg-gray-100 transition-all flex items-center justify-center gap-2 shadow-lg"
                                >
                                    <Send className="w-5 h-5" />
                                    Review & Publish
                                </button>
                            )
                        )}

                        {isPosted && (
                            <div className="text-center py-3 text-emerald-500 font-medium flex items-center justify-center gap-2">
                                <Check className="w-5 h-5" />
                                Already Published
                            </div>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

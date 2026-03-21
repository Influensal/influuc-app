'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Twitter, Linkedin } from 'lucide-react';

import { format, parseISO } from 'date-fns';
import Image from 'next/image';
import { usePosts } from '@/contexts';

interface Post {
    id: string;
    platform: string;
    scheduled_date: string;
    content: string;
    format: string;
    status: string;
    image_url?: string;
    is_liked?: boolean;
    carousel_slides?: string[];
}

interface EditPublishModalProps {
    post: Post | null;
    onClose: () => void;
    onContentUpdate: (postId: string, newContent: string) => void;
    onLikeUpdate?: (postId: string, isLiked: boolean) => void;
    onPublishSuccess: (postId: string) => void;
    onImageUpdate?: (postId: string, newImageUrl: string) => void;
}

export default function EditPublishModal({
    post,
    onClose,
    onContentUpdate,
    onLikeUpdate,
    onPublishSuccess,
    onImageUpdate
}: EditPublishModalProps) {
    const { profile } = usePosts();
    const displayName = profile?.name || 'Demo Founder';
    const handle = `@${displayName.replace(/\s+/g, '').toLowerCase()}`;
    const headline = profile?.role && profile?.companyName ? `${profile.role} at ${profile.companyName}` : 'Founder & CEO';
    const firstInitial = displayName.charAt(0).toUpperCase();

    const [isEditing, setIsEditing] = useState(false);
    const [editedContent, setEditedContent] = useState(post?.content || '');
    const [isSaving, setIsSaving] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showConfirmPublish, setShowConfirmPublish] = useState(false);
    const [isLiked, setIsLiked] = useState(post?.is_liked || false);
    const [isLiking, setIsLiking] = useState(false);

    // Image Generation State
    const [isGeneratingImage, setIsGeneratingImage] = useState(false);
    const [imageUrl, setImageUrl] = useState<string | null>(post?.image_url || null);
    const [showImageOptions, setShowImageOptions] = useState(false);
    const [imageGenStatus, setImageGenStatus] = useState<'idle' | 'success' | 'error'>('idle');

    const isCarousel = post?.format === 'carousel' || post?.format === 'CAROUSEL';

    // Carousel Viewer State
    const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
    const [carouselSlides, setCarouselSlides] = useState<string[] | null>(post?.carousel_slides || null);
    const [isLoadingCarousel, setIsLoadingCarousel] = useState(false);
    const [slideScale, setSlideScale] = useState(0.45);
    const measureRef = useRef<HTMLDivElement>(null);

    // Calculate dynamic slide scale based on container width
    useEffect(() => {
        if (!measureRef.current) return;
        const observer = new ResizeObserver((entries) => {
            if (entries[0]) {
                const width = entries[0].contentRect.width;
                setSlideScale(width / 1080); // 1080 is the fixed wide of our carousel templates
            }
        });
        observer.observe(measureRef.current);
        return () => observer.disconnect();
    }, [isCarousel, currentSlideIndex]);

    // Prevent scrolling on body when modal is open
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    useEffect(() => {
        if (!post) return;
        setEditedContent(post.content);
        setImageUrl(post.image_url || null);
        setIsLiked(post.is_liked || false);
        setCurrentSlideIndex(0); // Reset slide index when post changes

        if (isCarousel) {
            if (post.carousel_slides && post.carousel_slides.length > 0) {
                setCarouselSlides(post.carousel_slides);
            } else {
                // If carousel slides are not in the initial post object, fetch them
                setIsLoadingCarousel(true);
                fetch(`/api/posts/${post.id}`)
                    .then(res => res.json())
                    .then(data => {
                        if (data.post?.carousel_slides) {
                            setCarouselSlides(data.post.carousel_slides);
                        }
                    })
                    .catch(err => console.error("Failed to load carousel slides:", err))
                    .finally(() => setIsLoadingCarousel(false));
            }
        } else {
            setCarouselSlides(null); // Clear carousel slides if not a carousel post
        }
    }, [post]);

    if (!post) return null;

    const PlatformIcon = post.platform.toLowerCase() === 'x' ? Twitter : Linkedin;
    const isPosted = post.status === 'posted' || post.status === 'POSTED';

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

    const handleToggleLike = async () => {
        if (isLiking) return;
        setIsLiking(true);
        const newLikeStatus = !isLiked;
        try {
            const response = await fetch(`/api/posts/${post.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_liked: newLikeStatus }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to update like status');
            }

            setIsLiked(newLikeStatus);
            if (onLikeUpdate) {
                onLikeUpdate(post.id, newLikeStatus);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update like status');
        } finally {
            setIsLiking(false);
        }
    };

    const handlePublish = async () => {
        setIsPublishing(true);
        setError(null);
        try {
            if (editedContent !== post.content) {
                await fetch(`/api/posts/${post.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ content: editedContent }),
                });
            }

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

    const handleGenerateImage = async (mode: 'faceless' | 'digital_twin') => {
        setIsGeneratingImage(true);
        setError(null);
        try {
            const response = await fetch(`/api/posts/${post.id}/generate-image`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode, aspectRatio: '16:9' }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to generate image');
            }

            setImageUrl(data.imageUrl);
            setShowImageOptions(false);
            if (onImageUpdate) {
                onImageUpdate(post.id, data.imageUrl);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to generate image');
        } finally {
            setIsGeneratingImage(false);
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

    const displayContent = editedContent || post.content;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 md:p-8"
            >
                <motion.div
                    initial={{ scale: 0.95, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.95, y: 20 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-[#0A0A0A] rounded-2xl border border-[var(--border)] max-w-[650px] w-[95vw] shadow-2xl flex flex-col overflow-hidden relative mx-auto my-auto max-h-[90vh]"
                >
                    {/* Header */}
                    <div className="p-4 md:p-5 border-b border-gray-800/50 flex items-center justify-between shrink-0 bg-[#0F0F0F] z-20">
                        <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 md:w-10 md:h-10 rounded-xl flex items-center justify-center ${post.platform.toLowerCase() === 'x'
                                ? 'bg-black text-white dark:bg-white dark:text-black border border-white/10'
                                : 'bg-[#0077B5] text-white'
                                }`}>
                                <PlatformIcon className="w-4 h-4 md:w-5 md:h-5" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-white/95 text-sm">
                                    {format(parseISO(post.scheduled_date), 'EEEE, MMM d')}
                                </h3>
                                <p className="text-xs text-gray-400">
                                    {format(parseISO(post.scheduled_date), 'h:mm a')} • {post.format}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleToggleLike}
                                disabled={isLiking}
                                className={`p-2 rounded-lg transition-all ${isLiked
                                    ? 'bg-red-500/10 text-red-500'
                                    : 'hover:bg-white/10 text-gray-400'
                                    }`}
                                title={isLiked ? "Unlike post" : "Like post"}
                            >
                                <i className="fi fi-sr-heart flex items-center justify-center w-5 h-5"></i>
                            </button>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-white/10 text-gray-400 rounded-lg transition-colors"
                            >
                                <i className="fi fi-sr-cross-small flex items-center justify-center w-5 h-5"></i>
                            </button>
                        </div>
                    </div>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto w-full p-4 md:p-6 lg:p-8 bg-[#0A0A0A] flex flex-col gap-6 relative">
                        {error && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-red-500 text-sm shrink-0">
                                <i className={`fi fi-sr-info flex items-center justify-center ${"w-4 h-4 flex-shrink-0"}`}  ></i>
                                <span>{error}</span>
                            </div>
                        )}

                        <div className="w-full">
                            <h4 className="text-xs font-bold text-gray-600 uppercase tracking-widest mb-4 flex items-center gap-2 select-none">
                                <PlatformIcon className="w-4 h-4" /> Platform Preview
                            </h4>

                            {post.platform.toLowerCase() === 'x' ? (
                                /* X (Twitter) Preview Card */
                                <div className="bg-black border border-gray-800 rounded-xl px-4 py-3 cursor-default">
                                    <div className="flex gap-3">
                                        {/* Avatar */}
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-800 to-gray-700 flex items-center justify-center shrink-0 overflow-hidden text-gray-300 font-bold">
                                            {firstInitial}
                                        </div>
                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-1 text-[15px] truncate">
                                                    <span className="font-semibold text-white/95 hover:underline cursor-pointer truncate">
                                                        {displayName}
                                                    </span>
                                                    <span className="text-blue-400 shrink-0">
                                                        <i className="fi fi-sr-check flex items-center justify-center w-[14px] h-[14px] fill-current text-white"></i>
                                                    </span>
                                                    <span className="text-gray-500 truncate ml-1 font-normal">
                                                        {handle}
                                                    </span>
                                                    <span className="text-gray-500 mx-1">·</span>
                                                    <span className="text-gray-500 hover:underline cursor-pointer">1m</span>
                                                </div>
                                                <i className="fi fi-sr-menu-dots flex items-center justify-center w-5 h-5 text-gray-500 hover:text-[var(--primary)] cursor-pointer shrink-0"></i>
                                            </div>

                                            <div className="mt-2 text-[15px] font-sans relative group">
                                                {!isEditing && !isPosted && !isCarousel && (
                                                    <button onClick={startEdit} className="absolute -top-6 right-0 text-xs font-medium text-[#1D9BF0] hover:opacity-80 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 px-2 py-1 rounded">
                                                        <i className={`fi fi-sr-pencil flex items-center justify-center ${"w-3 h-3"}`}  ></i> Edit
                                                    </button>
                                                )}
                                                {isEditing ? (
                                                    <textarea
                                                        value={editedContent}
                                                        onChange={(e) => setEditedContent(e.target.value)}
                                                        className="w-full min-h-[150px] p-2 bg-gray-900 rounded-lg text-white/90 leading-[1.6] resize-none focus:outline-none focus:ring-1 focus:ring-[#1D9BF0] border border-gray-700"
                                                        placeholder="Write your post content..."
                                                        autoFocus
                                                    />
                                                ) : (
                                                    <div className="leading-[1.6] font-light text-white/90 whitespace-pre-wrap break-words">{displayContent}</div>
                                                )}
                                            </div>

                                            {imageUrl && !isCarousel && (
                                                <div className="mt-3 rounded-2xl border border-gray-800 overflow-hidden relative group">
                                                    <Image src={imageUrl} alt="Post preview" width={800} height={450} className="w-full object-cover" />
                                                    {!isPosted && (
                                                        <button onClick={() => setImageUrl(null)} className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full text-white hover:bg-red-500/80 transition-colors opacity-0 group-hover:opacity-100">
                                                            <i className="fi fi-sr-trash flex items-center justify-center w-4 h-4"></i>
                                                        </button>
                                                    )}
                                                </div>
                                            )}

                                            {isCarousel && (
                                                <div className="mt-3 w-full rounded-2xl border border-gray-800 overflow-hidden bg-[#111] flex flex-col items-center justify-center aspect-[4/5] relative">
                                                    <i className={`fi fi-sr-layers flex items-center justify-center ${"w-12 h-12 text-indigo-400 mb-3"}`}  ></i>
                                                    <p className="text-white font-medium">Carousel Document</p>
                                                    <p className="text-sm text-gray-400 mb-6">{post.carousel_slides?.length || 0} Slides</p>

                                                    <a
                                                        href={`/dashboard/carousels/${post.id}`}
                                                        className="px-6 py-2.5 bg-white text-black font-semibold rounded-full hover:bg-gray-200 transition-colors flex items-center gap-2"
                                                    >
                                                        <i className={`fi fi-sr-pencil flex items-center justify-center ${"w-4 h-4"}`}  ></i>
                                                        View / Edit Carousel
                                                    </a>
                                                </div>
                                            )}

                                            {/* X Action Bar */}
                                            <div className="flex items-center justify-between mt-3 text-gray-500 max-w-md">
                                                <div className="flex items-center gap-2 hover:text-blue-500 cursor-pointer group transition-colors">
                                                    <div className="p-2 rounded-full group-hover:bg-blue-500/10 transition-colors"><i className={`fi fi-sr-comment flex items-center justify-center ${"w-[18px] h-[18px]"}`}  ></i></div>
                                                    <span className="text-[13px]">12</span>
                                                </div>
                                                <div className="flex items-center gap-2 hover:text-emerald-500 cursor-pointer group transition-colors">
                                                    <div className="p-2 rounded-full group-hover:bg-emerald-500/10 transition-colors"><i className={`fi fi-sr-rotate-right flex items-center justify-center ${"w-[18px] h-[18px]"}`}  ></i></div>
                                                    <span className="text-[13px]">4</span>
                                                </div>
                                                <div className="flex items-center gap-2 hover:text-pink-500 cursor-pointer group transition-colors">
                                                    <div className="p-2 rounded-full group-hover:bg-pink-500/10 transition-colors"><i className={`fi fi-sr-heart flex items-center justify-center ${"w-[18px] h-[18px]"}`}  ></i></div>
                                                    <span className="text-[13px]">48</span>
                                                </div>
                                                <div className="flex items-center gap-2 hover:text-blue-500 cursor-pointer group transition-colors">
                                                    <div className="p-2 rounded-full group-hover:bg-blue-500/10 transition-colors"><svg viewBox="0 0 24 24" aria-hidden="true" className="w-[18px] h-[18px] fill-current"><g><path d="M8.75 21V3h2v18h-2zM18 21V8.5h2V21h-2zM4 21l.004-10h2L6 21H4zm9.248 0v-7h2v7h-2z"></path></g></svg></div>
                                                    <span className="text-[13px]">1.2K</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <div className="p-2 rounded-full hover:bg-blue-500/10 hover:text-blue-500 cursor-pointer transition-colors"><i className={`fi fi-sr-bookmark flex items-center justify-center ${"w-[18px] h-[18px]"}`}  ></i></div>
                                                    <div className="p-2 rounded-full hover:bg-blue-500/10 hover:text-blue-500 cursor-pointer transition-colors"><i className={`fi fi-sr-share flex items-center justify-center ${"w-[18px] h-[18px]"}`}  ></i></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                /* LinkedIn Preview Card */
                                <div className="bg-[#1b1f23] rounded-xl shadow-[0_0_0_1px_rgba(255,255,255,0.1)] pt-3 pb-1 flex flex-col cursor-default">
                                    <div className="px-4 flex items-center gap-3 mb-2">
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-700 to-gray-600 flex items-center justify-center shrink-0 overflow-hidden text-gray-300 font-bold text-lg">
                                            {firstInitial}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1">
                                                <span className="font-medium text-[14px] text-white/95 hover:underline cursor-pointer hover:text-[#70b5f9]">
                                                    {displayName}
                                                </span>
                                                <span className="text-gray-400 text-xs text-opacity-80"> • 1st</span>
                                            </div>
                                            <div className="text-[12px] text-gray-400 truncate leading-tight">
                                                {headline}
                                            </div>
                                            <div className="text-[12px] text-gray-400 flex items-center gap-1 leading-tight">
                                                1m • <svg className="w-3 h-3 fill-current" viewBox="0 0 16 16"><path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 12.25A5.25 5.25 0 1113.25 8 5.25 5.25 0 018 13.25zM8 4a4 4 0 100 8A4 4 0 008 4z"></path></svg>
                                            </div>
                                        </div>
                                        <i className={`fi fi-sr-menu-dots flex items-center justify-center ${"w-5 h-5 text-gray-500 cursor-pointer self-start mt-1 shrink-0"}`}  ></i>
                                    </div>

                                    <div className="px-4 mt-1 mb-1 text-[14px] leading-relaxed font-light text-[#E9EAEC]/90 whitespace-pre-wrap break-words font-sans">
                                        {displayContent}
                                    </div>

                                    {imageUrl && !isCarousel && (
                                        <div className="mt-3 w-full bg-black/50 overflow-hidden">
                                            <Image src={imageUrl} alt="Post preview" width={800} height={450} className="w-full object-cover" />
                                        </div>
                                    )}

                                    {isCarousel && (
                                        <div className="mt-3 w-full bg-[#f9fafb] border-y border-white/10 flex flex-col items-center justify-center relative aspect-[4/5] overflow-hidden">
                                            <i className={`fi fi-sr-layers flex items-center justify-center ${"w-12 h-12 text-indigo-500/60 mb-3"}`}  ></i>
                                            <p className="text-gray-900 font-medium">Carousel Document</p>
                                            <p className="text-sm text-gray-500 mb-6">{post.carousel_slides?.length || 0} Slides</p>

                                            <a
                                                href={`/dashboard/carousels/${post.id}`}
                                                className="px-6 py-2.5 bg-[#0A66C2] text-white font-semibold rounded-full hover:bg-[#004182] transition-colors flex items-center gap-2"
                                            >
                                                <i className={`fi fi-sr-pencil flex items-center justify-center ${"w-4 h-4"}`}  ></i>
                                                View / Edit Carousel
                                            </a>
                                        </div>
                                    )}

                                    {/* LinkedIn Action Bar */}
                                    <div className="px-4 mt-2">
                                        <div className="flex items-center py-2 border-b border-white/10 text-[12px] text-gray-400">
                                            <div className="flex items-center gap-1 hover:text-[#70b5f9] cursor-pointer">
                                                <div className="flex -space-x-1">
                                                    <span className="w-4 h-4 bg-blue-900/30 rounded-full flex items-center justify-center border-[1.5px] border-[#1b1f23] z-10"><i className={`fi fi-sr-social-network flex items-center justify-center ${"w-2.5 h-2.5 text-blue-400 fill-current"}`}  ></i></span>
                                                    <span className="w-4 h-4 bg-red-900/30 rounded-full flex items-center justify-center border-[1.5px] border-[#1b1f23]"><i className={`fi fi-sr-heart flex items-center justify-center ${"w-2.5 h-2.5 text-red-400 fill-current"}`}  ></i></span>
                                                </div>
                                                <span>42</span>
                                            </div>
                                            <span className="mx-1">•</span>
                                            <span className="hover:text-[#70b5f9] cursor-pointer hover:underline">12 comments</span>
                                        </div>
                                        <div className="flex justify-between py-1 mt-1 text-[#C8CBCE] font-semibold text-[14px]">
                                            <div className="flex items-center justify-center gap-1.5 py-3 px-2 flex-1 rounded hover:bg-white/10 cursor-pointer transition-colors">
                                                <i className={`fi fi-sr-social-network flex items-center justify-center ${"w-5 h-5"}`}  ></i> <span>Like</span>
                                            </div>
                                            <div className="flex items-center justify-center gap-1.5 py-3 px-2 flex-1 rounded hover:bg-white/10 cursor-pointer transition-colors">
                                                <i className={`fi fi-sr-comment flex items-center justify-center ${"w-5 h-5 transform -scale-x-100"}`}  ></i> <span>Comment</span>
                                            </div>
                                            <div className="flex items-center justify-center gap-1.5 py-3 px-2 flex-1 rounded hover:bg-white/10 cursor-pointer transition-colors">
                                                <i className={`fi fi-sr-rotate-right flex items-center justify-center ${"w-5 h-5"}`}  ></i> <span>Repost</span>
                                            </div>
                                            <div className="flex items-center justify-center gap-1.5 py-3 px-2 flex-1 rounded hover:bg-white/10 cursor-pointer transition-colors">
                                                <i className={`fi fi-sr-paper-plane flex items-center justify-center ${"w-5 h-5 -rotate-45 -mt-1"}`}  ></i> <span>Send</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                        </div>


                    </div>

                    {/* Media generator buttons below the preview block (Sticky) */}
                    {!isCarousel && !isPosted && (
                        <div className="border-t border-gray-800/60 bg-[#0A0A0A] p-4 px-4 md:px-8 shrink-0 z-20">
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="font-semibold text-sm text-gray-300 uppercase tracking-wider flex items-center gap-2 select-none">
                                    <i className="fi fi-sr-picture flex items-center justify-center w-4 h-4"></i>
                                    Media Attachment
                                </h4>
                            </div>

                            {!imageUrl && !showImageOptions && (
                                <button
                                    onClick={() => setShowImageOptions(true)}
                                    className="w-full py-3 rounded-xl font-medium border border-dashed border-indigo-500/50 text-indigo-400 hover:bg-indigo-500/10 hover:border-indigo-400 transition-all flex items-center justify-center gap-2"
                                >
                                    <i className="fi fi-sr-picture flex items-center justify-center w-5 h-5"></i>
                                    Generate AI Image
                                </button>
                            )}

                            {showImageOptions && !imageUrl && (
                                <div className="bg-[#111111] p-3 rounded-xl border border-gray-800">
                                    <p className="text-xs text-gray-500 mb-2 text-center">Select generation mode:</p>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            onClick={() => handleGenerateImage('faceless')}
                                            disabled={isGeneratingImage}
                                            className="p-2 rounded-xl border border-gray-800 bg-[#0A0A0A] hover:border-indigo-500 transition-all flex items-center justify-center gap-2 disabled:opacity-50 group"
                                        >
                                            <i className={`fi fi-sr-magic-wand flex items-center justify-center ${"w-4 h-4 text-indigo-500 group-hover:scale-110 transition-transform"}`}  ></i>
                                            <span className="font-medium text-sm text-gray-300 group-hover:text-white">Faceless</span>
                                        </button>
                                        <button
                                            onClick={() => handleGenerateImage('digital_twin')}
                                            disabled={isGeneratingImage}
                                            className="p-2 rounded-xl border border-gray-800 bg-[#0A0A0A] hover:border-purple-500 transition-all flex items-center justify-center gap-2 disabled:opacity-50 group"
                                        >
                                            <i className={`fi fi-sr-user flex items-center justify-center ${"w-4 h-4 text-purple-500 group-hover:scale-110 transition-transform"}`}  ></i>
                                            <span className="font-medium text-sm text-gray-300 group-hover:text-white">Digital Twin</span>
                                        </button>
                                    </div>
                                    {isGeneratingImage && (
                                        <div className="flex items-center justify-center gap-2 text-xs text-indigo-400 mt-3 rounded-lg bg-indigo-500/10 p-2">
                                            <i className={`fi fi-sr-spinner flex items-center justify-center ${"w-4 h-4 animate-spin"}`}  ></i>
                                            Generating cinematic visual...
                                        </div>
                                    )}
                                    <button
                                        onClick={() => setShowImageOptions(false)}
                                        disabled={isGeneratingImage}
                                        className="w-full py-2 text-xs font-medium rounded-lg text-gray-500 hover:text-white mt-2 transition-colors hover:bg-white/5"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Footer Actions */}
                    <div className="p-4 md:p-5 border-t border-gray-800/50 bg-[#0F0F0F] shrink-0 z-20">
                        {isPosted && (
                            <div className="text-center py-3.5 mb-2 rounded-xl bg-emerald-500/10 text-emerald-500 font-medium flex items-center justify-center gap-2 border border-emerald-500/20">
                                <i className="fi fi-sr-check flex items-center justify-center w-5 h-5"></i>
                                Successfully Published
                            </div>
                        )}
                        <div className="flex gap-3">
                            {isEditing ? (
                                <>
                                    <button
                                        onClick={cancelEdit}
                                        className="flex-1 py-3.5 rounded-xl font-medium bg-[#1A1A1A] text-white hover:bg-[#2A2A2A] transition-all flex items-center justify-center gap-2 border border-white/5"
                                    >
                                        <i className={`fi fi-sr-cross-small flex items-center justify-center ${"w-4 h-4 text-gray-400"}`}  ></i>
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        disabled={isSaving}
                                        className="flex-1 py-3.5 rounded-xl font-medium bg-white text-black hover:bg-gray-100 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-[0_0_20px_rgba(255,255,255,0.15)]"
                                    >
                                        {isSaving ? (
                                            <i className={`fi fi-sr-spinner flex items-center justify-center ${"w-4 h-4 animate-spin"}`}  ></i>
                                        ) : (
                                            <i className={`fi fi-sr-disk flex items-center justify-center ${"w-4 h-4"}`}  ></i>
                                        )}
                                        Save Changes
                                    </button>
                                </>
                            ) : (
                                <>
                                    {!isPosted && !isCarousel && (
                                        post.platform.toLowerCase() === 'x' ? (
                                            // X (Twitter) Flow
                                            <button
                                                onClick={handleCopy}
                                                className="flex-1 py-3.5 rounded-xl font-semibold bg-white text-black hover:bg-gray-100 transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.15)]"
                                            >
                                                {copied ? (
                                                    <>
                                                        <i className={`fi fi-sr-check flex items-center justify-center ${"w-5 h-5 text-green-600"}`}  ></i>
                                                        Copied!
                                                    </>
                                                ) : (
                                                    <>
                                                        <i className={`fi fi-sr-copy flex items-center justify-center ${"w-5 h-5"}`}  ></i>
                                                        Copy & Open X
                                                    </>
                                                )}
                                            </button>
                                        ) : (
                                            // LinkedIn Flow
                                            showConfirmPublish ? (
                                                <div className="flex gap-3 w-full">
                                                    <button
                                                        onClick={() => setShowConfirmPublish(false)}
                                                        className="flex-1 py-3.5 rounded-xl font-semibold bg-[#1A1A1A] text-white hover:bg-[#2A2A2A] transition-all border border-white/5"
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        onClick={handlePublish}
                                                        disabled={isPublishing}
                                                        className="flex-1 py-3.5 rounded-xl font-semibold bg-[#0A66C2] text-white hover:bg-[#004182] transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-[0_0_20px_rgba(10,102,194,0.3)]"
                                                    >
                                                        {isPublishing ? (
                                                            <i className={`fi fi-sr-spinner flex items-center justify-center ${"w-5 h-5 animate-spin"}`}  ></i>
                                                        ) : (
                                                            <>
                                                                <i className={`fi fi-sr-paper-plane flex items-center justify-center ${"w-5 h-5"}`}  ></i>
                                                                Confirm Publish
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => setShowConfirmPublish(true)}
                                                    className="w-full py-3.5 rounded-xl font-semibold bg-[#0A66C2] text-white hover:bg-[#004182] transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(10,102,194,0.3)]"
                                                >
                                                    <i className={`fi fi-sr-paper-plane flex items-center justify-center ${"w-5 h-5"}`}  ></i>
                                                    Publish to LinkedIn
                                                </button>
                                            )
                                        )
                                    )}
                                    {post.platform.toLowerCase() === 'x' && !isPosted && !isCarousel && (
                                        <button
                                            onClick={async () => {
                                                try {
                                                    await fetch(`/api/posts/${post.id}/publish`, { method: 'POST' });
                                                    onPublishSuccess(post.id);
                                                    onClose();
                                                } catch (e) { alert('Failed to mark as posted'); }
                                            }}
                                            className="w-14 shrink-0 rounded-xl font-medium bg-green-500/10 hover:bg-green-500/20 text-green-500 transition-all flex items-center justify-center border border-green-500/20"
                                            title="Mark as posted"
                                        >
                                            <i className={`fi fi-sr-check flex items-center justify-center ${"w-5 h-5"}`}  ></i>
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

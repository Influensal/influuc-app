'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Upload, Camera, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';

interface DigitalTwinTrainingProps {
    activeProfile: any;
}

export function DigitalTwinTraining({ activeProfile }: DigitalTwinTrainingProps) {
    const avatarUrls = activeProfile?.avatar_urls || [];
    const hasOnboardingPhotos = avatarUrls.length > 0;
    const defaultOnboardingPhoto = hasOnboardingPhotos ? avatarUrls[0] : null;

    const [file, setFile] = useState<File | null>(null);
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [trainingStatus, setTrainingStatus] = useState<string>(activeProfile?.visual_training_status || 'not_started');
    const [error, setError] = useState('');

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
            if (!validTypes.includes(selectedFile.type)) {
                setError('Please upload a valid image file (JPEG, PNG, WEBP).');
                return;
            }
            setFile(selectedFile);
            setError('');

            // Show a local preview
            const reader = new FileReader();
            reader.onload = (e) => setImageUrl(e.target?.result as string);
            reader.readAsDataURL(selectedFile);
        }
    };

    const handleStartSetup = async (useOnboardingPhoto: boolean = false) => {
        if (!useOnboardingPhoto && (!file || !imageUrl)) return;
        setIsUploading(true);
        setError('');

        try {
            const payload = useOnboardingPhoto
                ? { imageUrl: defaultOnboardingPhoto }
                : { imageBase64: imageUrl };

            // STEP 1: Pass Base64 image OR direct public URL to backend
            const res = await fetch('/api/visuals/train', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to initialize Digital Twin');
            }

            setTrainingStatus('completed');

        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsUploading(false);
        }
    };

    if (trainingStatus === 'completed') {
        return (
            <div className="bg-[var(--surface)] border border-[var(--primary)] rounded-2xl p-12 text-center shadow-[0_0_30px_rgba(var(--primary-rgb),0.1)]">
                <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 className="w-10 h-10 text-green-500" />
                </div>
                <h3 className="text-3xl font-black text-[var(--foreground)] mb-4">Digital Twin Ready!</h3>
                <p className="text-lg text-[var(--foreground-muted)] max-w-lg mx-auto">
                    Your Face Clone reference is securely stored and active. You can now use the <strong>Image Generator</strong> above with the "Digital Twin" mode turned on to place yourself in any AI-generated scenario instantly.
                </p>
            </div>
        );
    }

    // New Streamlined Onboarding Photo Path
    if (hasOnboardingPhotos) {
        return (
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-8 shadow-sm flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-[var(--primary)]/10 rounded-2xl flex items-center justify-center mb-6">
                    <Camera className="w-8 h-8 text-[var(--primary)]" />
                </div>
                <h3 className="text-2xl font-bold text-[var(--foreground)] mb-2">Initialize Your Digital Twin</h3>
                <p className="text-[var(--foreground-muted)] max-w-xl mb-8">
                    We found clear reference photos from your onboarding! We can instantly activate your Digital Twin using this photo, allowing you to swap your face into any AI-generated scenery with zero wait time.
                </p>

                <div className="bg-[var(--background)] p-6 rounded-xl border border-[var(--border)] relative overflow-hidden flex flex-col items-center justify-center mb-8 max-w-sm w-full">
                    <img src={defaultOnboardingPhoto} alt="Onboarding Reference" className="w-32 h-32 object-cover rounded-full mb-4 border-4 border-[var(--primary)] shadow-lg" />
                    <h4 className="font-bold text-[var(--foreground)] mb-1">Onboarding Photo</h4>
                    <p className="text-xs text-[var(--foreground-muted)]">Verified Reference</p>
                </div>

                {error && (
                    <div className="flex items-center p-4 mb-6 bg-[var(--error)]/10 border border-[var(--error)]/20 rounded-xl text-[var(--error)] text-sm max-w-md w-full">
                        <AlertCircle className="w-5 h-5 mr-3 shrink-0" />
                        {error}
                    </div>
                )}

                <button
                    onClick={() => handleStartSetup(true)}
                    disabled={isUploading}
                    className="w-full max-w-md flex items-center justify-center py-4 rounded-xl bg-[var(--primary)] text-white font-bold text-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isUploading ? (
                        <>
                            <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                            Activating Digital Twin...
                        </>
                    ) : (
                        'Activate with this Photo'
                    )}
                </button>
            </div>
        );
    }

    // Fallback Manual Upload Path
    return (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-8 shadow-sm">
            <div className="text-center mb-10">
                <div className="w-16 h-16 bg-[var(--primary)]/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <Camera className="w-8 h-8 text-[var(--primary)]" />
                </div>
                <h3 className="text-2xl font-bold text-[var(--foreground)] mb-2">Initialize Your Digital Twin</h3>
                <p className="text-[var(--foreground-muted)] max-w-xl mx-auto">
                    Upload a single, high-quality selfie. The AI will instantly lock onto your facial structure, allowing you to seamlessly swap your face into any AI-generated scenery with zero wait time.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <div className="bg-[var(--background)] p-6 rounded-xl border border-[var(--border)]">
                    <h4 className="font-bold text-[var(--foreground)] mb-4 flex items-center">
                        <CheckCircle2 className="w-5 h-5 text-green-500 mr-2" />
                        Best Practices for Face Swap
                    </h4>
                    <ul className="space-y-3 text-sm text-[var(--foreground-muted)]">
                        <li>• <strong>1 single clear photo</strong> is all you need.</li>
                        <li>• Face directly towards the camera (no heavy angles).</li>
                        <li>• Ensure good, even lighting (no harsh shadows).</li>
                        <li>• High quality, uncompressed JPEGs or PNGs.</li>
                        <li>• No glasses, hats, or hair covering your face for best results.</li>
                    </ul>
                </div>

                <div className="bg-[var(--background)] p-6 rounded-xl border border-[var(--border)] relative overflow-hidden flex flex-col items-center justify-center text-center">
                    <input
                        type="file"
                        accept="image/jpeg, image/png, image/webp"
                        onChange={handleFileChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />

                    {imageUrl ? (
                        <div className="w-full flex-col items-center flex">
                            <img src={imageUrl} alt="Preview" className="w-24 h-24 object-cover rounded-full mb-3 border-4 border-[var(--primary)] shadow-lg" />
                            <h4 className="font-bold text-[var(--foreground)] mb-1 truncate max-w-[200px]">
                                {file?.name}
                            </h4>
                            <p className="text-xs text-[var(--primary)] font-medium">Click to replace</p>
                        </div>
                    ) : (
                        <>
                            <Upload className="w-10 h-10 text-[var(--primary)] mb-4" />
                            <h4 className="font-bold text-[var(--foreground)] mb-2">Upload Selfie</h4>
                            <p className="text-sm text-[var(--foreground-muted)]">Drag & drop or click to select.</p>
                        </>
                    )}
                </div>
            </div>

            {error && (
                <div className="flex items-center p-4 mb-6 bg-[var(--error)]/10 border border-[var(--error)]/20 rounded-xl text-[var(--error)] text-sm">
                    <AlertCircle className="w-5 h-5 mr-3 shrink-0" />
                    {error}
                </div>
            )}

            <button
                onClick={() => handleStartSetup(false)}
                disabled={!file || isUploading}
                className="w-full flex items-center justify-center py-4 rounded-xl bg-[var(--primary)] text-white font-bold text-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isUploading ? (
                    <>
                        <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                        Processing Neural Face Map...
                    </>
                ) : (
                    'Activate Digital Twin'
                )}
            </button>
        </div>
    );
}

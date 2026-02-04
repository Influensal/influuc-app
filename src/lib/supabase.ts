import { createClient, SupabaseClient } from '@supabase/supabase-js';

// These will be replaced with actual values from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Create Supabase client - use placeholder if not configured (for mock mode)
// The actual client will only be used when isSupabaseConfigured() returns true
let supabase: SupabaseClient;

if (supabaseUrl && supabaseAnonKey) {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
} else {
    // Create a dummy client for type safety - operations will check isSupabaseConfigured() first
    supabase = createClient('https://placeholder.supabase.co', 'placeholder-key');
}

export { supabase };

// Database types (will be expanded)
export interface Account {
    id: string;
    email: string;
    created_at: string;
    plan_tier: 'solo' | 'team' | 'scale';
}

export interface FounderProfile {
    id: string;
    account_id: string;
    name: string;
    platforms: {
        x: boolean;
        linkedin: boolean;
    };
    industry: string;
    target_audience: string;
    content_goal: string;
    topics: string[];
    cadence: 'light' | 'moderate' | 'active';
    tone: {
        formality: 'professional' | 'casual';
        boldness: 'bold' | 'measured';
        style: 'educational' | 'conversational';
        approach: 'story-driven' | 'data-driven';
    };
    voice_model_id: string | null;
    next_generation_date: string | null;
    created_at: string;
}

export interface VoiceSample {
    id: string;
    profile_id: string;
    content: string;
    source_type: 'paste' | 'upload' | 'voicenote' | 'url';
    created_at: string;
}

export interface Post {
    id: string;
    profile_id: string;
    platform: 'x' | 'linkedin';
    scheduled_date: string;
    content: string;
    hooks: string[];
    selected_hook: string;
    cta: string | null;
    format: 'single' | 'thread' | 'long_form' | 'video_script' | 'carousel';
    status: 'scheduled' | 'posted' | 'skipped';
    created_at: string;
}

export interface SpontaneousIdea {
    id: string;
    profile_id: string;
    input: string;
    input_type: 'text' | 'voicenote' | 'url';
    generated_content: string | null;
    platform: 'x' | 'linkedin' | null;
    saved: boolean;
    created_at: string;
}

export interface LearningLoopState {
    id: string;
    profile_id: string;
    patterns: Record<string, unknown>;
    updated_at: string;
}

// Helper to check if Supabase is configured
export const isSupabaseConfigured = () => {
    return supabaseUrl && supabaseAnonKey;
};

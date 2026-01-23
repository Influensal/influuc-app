-- ============================================
-- SOCIAL CONNECTIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS social_connections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    platform TEXT CHECK (platform IN ('x', 'linkedin')) NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    expires_at TIMESTAMPTZ,
    profile_id TEXT, -- The external platform ID
    profile_name TEXT, -- Display Name
    profile_handle TEXT, -- @handle
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, platform)
);

-- RLS
ALTER TABLE social_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own connections" ON social_connections
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own connections" ON social_connections
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own connections" ON social_connections
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own connections" ON social_connections
    FOR DELETE USING (auth.uid() = user_id);

-- INDEX
CREATE INDEX IF NOT EXISTS idx_social_connections_user_id ON social_connections(user_id);

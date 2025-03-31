-- Initialize database schema for Captain's Log application

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    settings JSONB DEFAULT '{"audioQuality": "medium", "silenceThreshold": 30}'::jsonb,
    reset_token UUID NULL,
    reset_token_expiry TIMESTAMP NULL,
    last_login_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create recordings table
CREATE TABLE IF NOT EXISTS recordings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    duration VARCHAR(50) NOT NULL,
    file_path VARCHAR(255) NULL, -- Path to stored file
    recorded_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create transcriptions table
CREATE TABLE IF NOT EXISTS transcriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recording_id UUID REFERENCES recordings(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    metadata JSONB NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create tags table
CREATE TABLE IF NOT EXISTS tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create recording_tags table (many-to-many)
CREATE TABLE IF NOT EXISTS recording_tags (
    recording_id UUID REFERENCES recordings(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (recording_id, tag_id)
);

-- Add vector search capability
CREATE EXTENSION IF NOT EXISTS "vector";

-- Create transcription vectors table for semantic search
CREATE TABLE IF NOT EXISTS transcription_vectors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transcription_id UUID REFERENCES transcriptions(id) ON DELETE CASCADE,
    embedding VECTOR(1536),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create index for vector similarity search
CREATE INDEX IF NOT EXISTS transcription_vectors_embedding_idx ON transcription_vectors USING ivfflat (embedding vector_cosine_ops);

-- Create default admin user
-- Password: 'enterprise' (this should be properly hashed in a real application)
INSERT INTO users (id, name, email, password, created_at, updated_at)
VALUES (
    '00000000-0000-0000-0000-000000000000',
    'Captain',
    'captain@starfleet.com',
    '$2b$10$9tWMXXv9/A8EJXu9TE1XAew2AZwVUzvYJA.uQ3XVrxnfcJQiG0Jh6', -- hashed 'enterprise'
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT (id) DO NOTHING;
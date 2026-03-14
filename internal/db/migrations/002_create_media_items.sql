DO $$ BEGIN
    CREATE TYPE media_type AS ENUM ('game', 'book', 'movie', 'tv_show');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS media_items (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type       media_type NOT NULL,
    title      TEXT NOT NULL,
    metadata   JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_media_items_type ON media_items(type);
CREATE INDEX IF NOT EXISTS idx_media_items_title ON media_items USING gin(to_tsvector('english', title));

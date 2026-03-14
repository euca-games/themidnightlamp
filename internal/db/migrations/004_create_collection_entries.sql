CREATE TABLE IF NOT EXISTS collection_entries (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    media_item_id UUID NOT NULL REFERENCES media_items(id) ON DELETE CASCADE,
    rating        NUMERIC(2,1) CHECK (rating >= 0.0 AND rating <= 5.0),
    status        TEXT NOT NULL DEFAULT 'want' CHECK (status IN ('want', 'in_progress', 'completed', 'dropped')),
    notes         TEXT,
    started_at    DATE,
    completed_at  DATE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(collection_id, media_item_id)
);

CREATE INDEX IF NOT EXISTS idx_entries_collection_id ON collection_entries(collection_id);

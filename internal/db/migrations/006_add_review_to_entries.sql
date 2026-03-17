ALTER TABLE collection_entries ADD COLUMN IF NOT EXISTS review TEXT;
ALTER TABLE collection_entries ADD CONSTRAINT review_max_length CHECK (length(review) <= 5000);

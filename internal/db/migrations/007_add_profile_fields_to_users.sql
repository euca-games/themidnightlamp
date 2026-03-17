ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE users ADD CONSTRAINT bio_max_length CHECK (length(bio) <= 500);
ALTER TABLE users ADD CONSTRAINT avatar_url_max_length CHECK (length(avatar_url) <= 2048);

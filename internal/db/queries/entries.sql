-- name: CreateEntry :one
INSERT INTO collection_entries (collection_id, media_item_id, rating, status, notes, started_at, completed_at)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING *;

-- name: GetEntry :one
SELECT * FROM collection_entries WHERE id = $1;

-- name: ListEntriesByCollection :many
SELECT ce.*, mi.title, mi.type, mi.metadata
FROM collection_entries ce
JOIN media_items mi ON mi.id = ce.media_item_id
WHERE ce.collection_id = $1
ORDER BY ce.updated_at DESC;

-- name: UpdateEntry :one
UPDATE collection_entries
SET rating       = $2,
    status       = COALESCE(NULLIF($3, ''), status),
    notes        = $4,
    started_at   = $5,
    completed_at = $6,
    updated_at   = now()
WHERE id = $1
RETURNING *;

-- name: DeleteEntry :exec
DELETE FROM collection_entries WHERE id = $1;

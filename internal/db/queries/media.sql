-- name: CreateMediaItem :one
INSERT INTO media_items (type, title, metadata)
VALUES ($1, $2, $3)
RETURNING *;

-- name: GetMediaItem :one
SELECT * FROM media_items WHERE id = $1;

-- name: ListMediaItems :many
SELECT * FROM media_items
WHERE ($1::media_type IS NULL OR type = $1)
  AND ($2::text = '' OR title ILIKE '%' || $2 || '%')
ORDER BY title
LIMIT $3 OFFSET $4;

-- name: CountMediaItems :one
SELECT COUNT(*) FROM media_items
WHERE ($1::media_type IS NULL OR type = $1)
  AND ($2::text = '' OR title ILIKE '%' || $2 || '%');

-- name: UpdateMediaItem :one
UPDATE media_items
SET title    = COALESCE(NULLIF($2, ''), title),
    metadata = COALESCE($3, metadata)
WHERE id = $1
RETURNING *;

-- name: DeleteMediaItem :exec
DELETE FROM media_items WHERE id = $1;

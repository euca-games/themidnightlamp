-- name: CreateCollection :one
INSERT INTO collections (user_id, name, type, description, is_public)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- name: GetCollection :one
SELECT * FROM collections WHERE id = $1;

-- name: ListCollectionsByUser :many
SELECT * FROM collections
WHERE user_id = $1
  AND ($2::media_type IS NULL OR type = $2)
ORDER BY created_at DESC;

-- name: UpdateCollection :one
UPDATE collections
SET name        = COALESCE(NULLIF($2, ''), name),
    description = $3,
    is_public   = $4,
    updated_at  = now()
WHERE id = $1
RETURNING *;

-- name: DeleteCollection :exec
DELETE FROM collections WHERE id = $1;

-- name: GetPublicCollectionsByUsername :many
SELECT c.* FROM collections c
JOIN users u ON u.id = c.user_id
WHERE u.username = $1 AND c.is_public = true
ORDER BY c.created_at DESC;

-- name: GetPublicCollection :one
SELECT c.* FROM collections c
JOIN users u ON u.id = c.user_id
WHERE u.username = $1 AND c.id = $2 AND c.is_public = true;

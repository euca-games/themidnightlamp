package store

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Store struct {
	pool *pgxpool.Pool
}

func New(pool *pgxpool.Pool) *Store {
	return &Store{pool: pool}
}

// --- Users ---

type User struct {
	ID           uuid.UUID `json:"id"`
	Username     string    `json:"username"`
	Email        string    `json:"email"`
	PasswordHash string    `json:"-"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

func (s *Store) CreateUser(ctx context.Context, username, email, passwordHash string) (*User, error) {
	var u User
	err := s.pool.QueryRow(ctx,
		`INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email, password_hash, created_at, updated_at`,
		username, email, passwordHash,
	).Scan(&u.ID, &u.Username, &u.Email, &u.PasswordHash, &u.CreatedAt, &u.UpdatedAt)
	return &u, err
}

func (s *Store) GetUserByEmail(ctx context.Context, email string) (*User, error) {
	var u User
	err := s.pool.QueryRow(ctx,
		`SELECT id, username, email, password_hash, created_at, updated_at FROM users WHERE email = $1`,
		email,
	).Scan(&u.ID, &u.Username, &u.Email, &u.PasswordHash, &u.CreatedAt, &u.UpdatedAt)
	return &u, err
}

func (s *Store) GetUserByUsername(ctx context.Context, username string) (*User, error) {
	var u User
	err := s.pool.QueryRow(ctx,
		`SELECT id, username, email, password_hash, created_at, updated_at FROM users WHERE username = $1`,
		username,
	).Scan(&u.ID, &u.Username, &u.Email, &u.PasswordHash, &u.CreatedAt, &u.UpdatedAt)
	return &u, err
}

func (s *Store) GetUserByID(ctx context.Context, id string) (*User, error) {
	var u User
	err := s.pool.QueryRow(ctx,
		`SELECT id, username, email, password_hash, created_at, updated_at FROM users WHERE id = $1`,
		id,
	).Scan(&u.ID, &u.Username, &u.Email, &u.PasswordHash, &u.CreatedAt, &u.UpdatedAt)
	return &u, err
}

func (s *Store) UpdateUser(ctx context.Context, id, username, email string) (*User, error) {
	var u User
	err := s.pool.QueryRow(ctx,
		`UPDATE users SET username = COALESCE(NULLIF($2, ''), username), email = COALESCE(NULLIF($3, ''), email), updated_at = now() WHERE id = $1 RETURNING id, username, email, password_hash, created_at, updated_at`,
		id, username, email,
	).Scan(&u.ID, &u.Username, &u.Email, &u.PasswordHash, &u.CreatedAt, &u.UpdatedAt)
	return &u, err
}

// --- Media Items ---

type MediaItem struct {
	ID        uuid.UUID       `json:"id"`
	Type      string          `json:"type"`
	Title     string          `json:"title"`
	Metadata  json.RawMessage `json:"metadata"`
	CreatedAt time.Time       `json:"created_at"`
}

func (s *Store) CreateMediaItem(ctx context.Context, mediaType, title string, metadata json.RawMessage) (*MediaItem, error) {
	if metadata == nil {
		metadata = json.RawMessage("{}")
	}
	var m MediaItem
	err := s.pool.QueryRow(ctx,
		`INSERT INTO media_items (type, title, metadata) VALUES ($1::media_type, $2, $3) RETURNING id, type, title, metadata, created_at`,
		mediaType, title, metadata,
	).Scan(&m.ID, &m.Type, &m.Title, &m.Metadata, &m.CreatedAt)
	return &m, err
}

func (s *Store) GetMediaItem(ctx context.Context, id string) (*MediaItem, error) {
	var m MediaItem
	err := s.pool.QueryRow(ctx,
		`SELECT id, type, title, metadata, created_at FROM media_items WHERE id = $1`,
		id,
	).Scan(&m.ID, &m.Type, &m.Title, &m.Metadata, &m.CreatedAt)
	return &m, err
}

type ListMediaParams struct {
	MediaType string
	Query     string
	Limit     int
	Offset    int
}

func (s *Store) ListMediaItems(ctx context.Context, p ListMediaParams) ([]MediaItem, int, error) {
	var typeParam *string
	if p.MediaType != "" {
		typeParam = &p.MediaType
	}

	rows, err := s.pool.Query(ctx,
		`SELECT id, type, title, metadata, created_at FROM media_items
		 WHERE ($1::text IS NULL OR type::text = $1)
		   AND ($2::text = '' OR title ILIKE '%' || $2 || '%')
		 ORDER BY title LIMIT $3 OFFSET $4`,
		typeParam, p.Query, p.Limit, p.Offset,
	)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var items []MediaItem
	for rows.Next() {
		var m MediaItem
		if err := rows.Scan(&m.ID, &m.Type, &m.Title, &m.Metadata, &m.CreatedAt); err != nil {
			return nil, 0, err
		}
		items = append(items, m)
	}

	var count int
	err = s.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM media_items WHERE ($1::text IS NULL OR type::text = $1) AND ($2::text = '' OR title ILIKE '%' || $2 || '%')`,
		typeParam, p.Query,
	).Scan(&count)

	return items, count, err
}

func (s *Store) UpdateMediaItem(ctx context.Context, id, title string, metadata json.RawMessage) (*MediaItem, error) {
	var m MediaItem
	err := s.pool.QueryRow(ctx,
		`UPDATE media_items SET title = COALESCE(NULLIF($2, ''), title), metadata = COALESCE($3, metadata) WHERE id = $1 RETURNING id, type, title, metadata, created_at`,
		id, title, metadata,
	).Scan(&m.ID, &m.Type, &m.Title, &m.Metadata, &m.CreatedAt)
	return &m, err
}

func (s *Store) DeleteMediaItem(ctx context.Context, id string) error {
	_, err := s.pool.Exec(ctx, `DELETE FROM media_items WHERE id = $1`, id)
	return err
}

// --- Collections ---

type Collection struct {
	ID          uuid.UUID `json:"id"`
	UserID      uuid.UUID `json:"user_id"`
	Name        string    `json:"name"`
	Type        string    `json:"type"`
	Description *string   `json:"description"`
	IsPublic    bool      `json:"is_public"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

func (s *Store) CreateCollection(ctx context.Context, userID, name, mediaType string, description *string, isPublic bool) (*Collection, error) {
	var c Collection
	err := s.pool.QueryRow(ctx,
		`INSERT INTO collections (user_id, name, type, description, is_public) VALUES ($1, $2, $3::media_type, $4, $5) RETURNING id, user_id, name, type, description, is_public, created_at, updated_at`,
		userID, name, mediaType, description, isPublic,
	).Scan(&c.ID, &c.UserID, &c.Name, &c.Type, &c.Description, &c.IsPublic, &c.CreatedAt, &c.UpdatedAt)
	return &c, err
}

func (s *Store) GetCollection(ctx context.Context, id string) (*Collection, error) {
	var c Collection
	err := s.pool.QueryRow(ctx,
		`SELECT id, user_id, name, type, description, is_public, created_at, updated_at FROM collections WHERE id = $1`,
		id,
	).Scan(&c.ID, &c.UserID, &c.Name, &c.Type, &c.Description, &c.IsPublic, &c.CreatedAt, &c.UpdatedAt)
	return &c, err
}

func (s *Store) ListCollectionsByUser(ctx context.Context, userID, mediaType string) ([]Collection, error) {
	var typeParam *string
	if mediaType != "" {
		typeParam = &mediaType
	}
	rows, err := s.pool.Query(ctx,
		`SELECT id, user_id, name, type, description, is_public, created_at, updated_at FROM collections WHERE user_id = $1 AND ($2::text IS NULL OR type::text = $2) ORDER BY created_at DESC`,
		userID, typeParam,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var cols []Collection
	for rows.Next() {
		var c Collection
		if err := rows.Scan(&c.ID, &c.UserID, &c.Name, &c.Type, &c.Description, &c.IsPublic, &c.CreatedAt, &c.UpdatedAt); err != nil {
			return nil, err
		}
		cols = append(cols, c)
	}
	return cols, nil
}

func (s *Store) UpdateCollection(ctx context.Context, id, name string, description *string, isPublic bool) (*Collection, error) {
	var c Collection
	err := s.pool.QueryRow(ctx,
		`UPDATE collections SET name = COALESCE(NULLIF($2, ''), name), description = $3, is_public = $4, updated_at = now() WHERE id = $1 RETURNING id, user_id, name, type, description, is_public, created_at, updated_at`,
		id, name, description, isPublic,
	).Scan(&c.ID, &c.UserID, &c.Name, &c.Type, &c.Description, &c.IsPublic, &c.CreatedAt, &c.UpdatedAt)
	return &c, err
}

func (s *Store) DeleteCollection(ctx context.Context, id string) error {
	_, err := s.pool.Exec(ctx, `DELETE FROM collections WHERE id = $1`, id)
	return err
}

func (s *Store) GetPublicCollectionsByUsername(ctx context.Context, username string) ([]Collection, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT c.id, c.user_id, c.name, c.type, c.description, c.is_public, c.created_at, c.updated_at FROM collections c JOIN users u ON u.id = c.user_id WHERE u.username = $1 AND c.is_public = true ORDER BY c.created_at DESC`,
		username,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var cols []Collection
	for rows.Next() {
		var c Collection
		if err := rows.Scan(&c.ID, &c.UserID, &c.Name, &c.Type, &c.Description, &c.IsPublic, &c.CreatedAt, &c.UpdatedAt); err != nil {
			return nil, err
		}
		cols = append(cols, c)
	}
	return cols, nil
}

func (s *Store) GetPublicCollection(ctx context.Context, username, collectionID string) (*Collection, error) {
	var c Collection
	err := s.pool.QueryRow(ctx,
		`SELECT c.id, c.user_id, c.name, c.type, c.description, c.is_public, c.created_at, c.updated_at FROM collections c JOIN users u ON u.id = c.user_id WHERE u.username = $1 AND c.id = $2 AND c.is_public = true`,
		username, collectionID,
	).Scan(&c.ID, &c.UserID, &c.Name, &c.Type, &c.Description, &c.IsPublic, &c.CreatedAt, &c.UpdatedAt)
	return &c, err
}

// --- Collection Entries ---

type Entry struct {
	ID           uuid.UUID  `json:"id"`
	CollectionID uuid.UUID  `json:"collection_id"`
	MediaItemID  uuid.UUID  `json:"media_item_id"`
	Rating       *float64   `json:"rating"`
	Status       string     `json:"status"`
	Notes        *string    `json:"notes"`
	StartedAt    *time.Time `json:"started_at"`
	CompletedAt  *time.Time `json:"completed_at"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
}

type EntryWithMedia struct {
	Entry
	Title    string          `json:"title"`
	Type     string          `json:"type"`
	Metadata json.RawMessage `json:"metadata"`
}

func (s *Store) CreateEntry(ctx context.Context, collectionID, mediaItemID string, rating *float64, status string, notes *string, startedAt, completedAt *time.Time) (*Entry, error) {
	var e Entry
	err := s.pool.QueryRow(ctx,
		`INSERT INTO collection_entries (collection_id, media_item_id, rating, status, notes, started_at, completed_at) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, collection_id, media_item_id, rating, status, notes, started_at, completed_at, created_at, updated_at`,
		collectionID, mediaItemID, rating, status, notes, startedAt, completedAt,
	).Scan(&e.ID, &e.CollectionID, &e.MediaItemID, &e.Rating, &e.Status, &e.Notes, &e.StartedAt, &e.CompletedAt, &e.CreatedAt, &e.UpdatedAt)
	return &e, err
}

func (s *Store) GetEntry(ctx context.Context, id string) (*Entry, error) {
	var e Entry
	err := s.pool.QueryRow(ctx,
		`SELECT id, collection_id, media_item_id, rating, status, notes, started_at, completed_at, created_at, updated_at FROM collection_entries WHERE id = $1`,
		id,
	).Scan(&e.ID, &e.CollectionID, &e.MediaItemID, &e.Rating, &e.Status, &e.Notes, &e.StartedAt, &e.CompletedAt, &e.CreatedAt, &e.UpdatedAt)
	return &e, err
}

func (s *Store) ListEntriesByCollection(ctx context.Context, collectionID string) ([]EntryWithMedia, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT ce.id, ce.collection_id, ce.media_item_id, ce.rating, ce.status, ce.notes, ce.started_at, ce.completed_at, ce.created_at, ce.updated_at, mi.title, mi.type, mi.metadata FROM collection_entries ce JOIN media_items mi ON mi.id = ce.media_item_id WHERE ce.collection_id = $1 ORDER BY ce.updated_at DESC`,
		collectionID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var entries []EntryWithMedia
	for rows.Next() {
		var e EntryWithMedia
		if err := rows.Scan(&e.ID, &e.CollectionID, &e.MediaItemID, &e.Rating, &e.Status, &e.Notes, &e.StartedAt, &e.CompletedAt, &e.CreatedAt, &e.UpdatedAt, &e.Title, &e.Type, &e.Metadata); err != nil {
			return nil, err
		}
		entries = append(entries, e)
	}
	return entries, nil
}

func (s *Store) ListEntriesByUser(ctx context.Context, userID, mediaType, status string) ([]EntryWithMedia, error) {
	var typeParam, statusParam *string
	if mediaType != "" {
		typeParam = &mediaType
	}
	if status != "" {
		statusParam = &status
	}
	rows, err := s.pool.Query(ctx,
		`SELECT DISTINCT ON (mi.id)
		   ce.id, ce.collection_id, ce.media_item_id, ce.rating, ce.status,
		   ce.notes, ce.started_at, ce.completed_at, ce.created_at, ce.updated_at,
		   mi.title, mi.type, mi.metadata
		 FROM collection_entries ce
		 JOIN media_items mi ON mi.id = ce.media_item_id
		 JOIN collections c ON c.id = ce.collection_id
		 WHERE c.user_id = $1
		   AND ($2::text IS NULL OR mi.type::text = $2)
		   AND ($3::text IS NULL OR ce.status::text = $3)
		 ORDER BY mi.id, ce.updated_at DESC`,
		userID, typeParam, statusParam,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var entries []EntryWithMedia
	for rows.Next() {
		var e EntryWithMedia
		if err := rows.Scan(&e.ID, &e.CollectionID, &e.MediaItemID, &e.Rating, &e.Status, &e.Notes, &e.StartedAt, &e.CompletedAt, &e.CreatedAt, &e.UpdatedAt, &e.Title, &e.Type, &e.Metadata); err != nil {
			return nil, err
		}
		entries = append(entries, e)
	}
	return entries, nil
}

func (s *Store) UpdateEntry(ctx context.Context, id string, rating *float64, status string, notes *string, startedAt, completedAt *time.Time) (*Entry, error) {
	var e Entry
	err := s.pool.QueryRow(ctx,
		`UPDATE collection_entries SET rating = $2, status = COALESCE(NULLIF($3, ''), status), notes = $4, started_at = $5, completed_at = $6, updated_at = now() WHERE id = $1 RETURNING id, collection_id, media_item_id, rating, status, notes, started_at, completed_at, created_at, updated_at`,
		id, rating, status, notes, startedAt, completedAt,
	).Scan(&e.ID, &e.CollectionID, &e.MediaItemID, &e.Rating, &e.Status, &e.Notes, &e.StartedAt, &e.CompletedAt, &e.CreatedAt, &e.UpdatedAt)
	return &e, err
}

func (s *Store) DeleteEntry(ctx context.Context, id string) error {
	_, err := s.pool.Exec(ctx, `DELETE FROM collection_entries WHERE id = $1`, id)
	return err
}

// --- Refresh Tokens ---

type RefreshToken struct {
	ID        uuid.UUID `json:"id"`
	UserID    uuid.UUID `json:"user_id"`
	TokenHash string    `json:"-"`
	ExpiresAt time.Time `json:"expires_at"`
	CreatedAt time.Time `json:"created_at"`
}

func hashToken(token string) string {
	h := sha256.Sum256([]byte(token))
	return hex.EncodeToString(h[:])
}

func (s *Store) CreateRefreshToken(ctx context.Context, userID, token string, expiresAt time.Time) (*RefreshToken, error) {
	var rt RefreshToken
	err := s.pool.QueryRow(ctx,
		`INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3) RETURNING id, user_id, token_hash, expires_at, created_at`,
		userID, hashToken(token), expiresAt,
	).Scan(&rt.ID, &rt.UserID, &rt.TokenHash, &rt.ExpiresAt, &rt.CreatedAt)
	return &rt, err
}

func (s *Store) GetRefreshToken(ctx context.Context, token string) (*RefreshToken, error) {
	var rt RefreshToken
	err := s.pool.QueryRow(ctx,
		`SELECT id, user_id, token_hash, expires_at, created_at FROM refresh_tokens WHERE token_hash = $1 AND expires_at > now()`,
		hashToken(token),
	).Scan(&rt.ID, &rt.UserID, &rt.TokenHash, &rt.ExpiresAt, &rt.CreatedAt)
	return &rt, err
}

func (s *Store) DeleteRefreshToken(ctx context.Context, token string) error {
	_, err := s.pool.Exec(ctx, `DELETE FROM refresh_tokens WHERE token_hash = $1`, hashToken(token))
	return err
}

func (s *Store) DeleteUserRefreshTokens(ctx context.Context, userID string) error {
	_, err := s.pool.Exec(ctx, `DELETE FROM refresh_tokens WHERE user_id = $1`, userID)
	return err
}

func (s *Store) UserExists(ctx context.Context, id string) (bool, error) {
	var exists bool
	err := s.pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM users WHERE id = $1)`, id).Scan(&exists)
	return exists, err
}

// Unused import fix
var _ = fmt.Sprintf

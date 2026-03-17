package handler

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"

	"themidnightlamp/internal/auth"
	"themidnightlamp/internal/model"
	"themidnightlamp/internal/sanitize"
	"themidnightlamp/internal/storage"
	"themidnightlamp/internal/store"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"
)

type UsersHandler struct {
	store     *store.Store
	r2        *storage.R2Client
	uploadDir string
}

func NewUsersHandler(s *store.Store, uploadDir string, r2 *storage.R2Client) *UsersHandler {
	if r2 == nil {
		os.MkdirAll(uploadDir, 0o755)
	}
	return &UsersHandler{store: s, r2: r2, uploadDir: uploadDir}
}

func (h *UsersHandler) Me(w http.ResponseWriter, r *http.Request) {
	u := auth.GetUser(r)
	user, err := h.store.GetUserByID(r.Context(), u.UserID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			model.WriteError(w, model.ErrNotFound)
			return
		}
		model.WriteError(w, model.ErrInternalServer)
		return
	}
	model.WriteJSON(w, http.StatusOK, user)
}

func (h *UsersHandler) UpdateMe(w http.ResponseWriter, r *http.Request) {
	u := auth.GetUser(r)
	var req struct {
		Username  string  `json:"username"`
		Email     string  `json:"email"`
		Bio       *string `json:"bio"`
		AvatarURL *string `json:"avatar_url"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		model.WriteError(w, model.ErrBadRequest)
		return
	}

	if req.Bio != nil && *req.Bio != "" {
		cleaned, ok := sanitize.Text(*req.Bio, 500)
		if !ok {
			model.WriteError(w, &model.APIError{Code: http.StatusBadRequest, Message: "bio contains invalid content or exceeds 500 characters"})
			return
		}
		req.Bio = &cleaned
	}

	if req.AvatarURL != nil && *req.AvatarURL != "" {
		cleaned, ok := sanitize.URL(*req.AvatarURL, 2048)
		if !ok {
			model.WriteError(w, &model.APIError{Code: http.StatusBadRequest, Message: "avatar_url must be a valid http(s) URL under 2048 characters"})
			return
		}
		req.AvatarURL = &cleaned
	}

	user, err := h.store.UpdateUser(r.Context(), u.UserID, req.Username, req.Email, req.Bio, req.AvatarURL)
	if err != nil {
		model.WriteError(w, model.ErrInternalServer)
		return
	}
	model.WriteJSON(w, http.StatusOK, user)
}

const maxAvatarSize = 2 << 20 // 2 MB

var allowedImageTypes = map[string]string{
	"image/jpeg": ".jpg",
	"image/png":  ".png",
	"image/gif":  ".gif",
	"image/webp": ".webp",
}

func (h *UsersHandler) UploadAvatar(w http.ResponseWriter, r *http.Request) {
	u := auth.GetUser(r)

	r.Body = http.MaxBytesReader(w, r.Body, maxAvatarSize)
	if err := r.ParseMultipartForm(maxAvatarSize); err != nil {
		model.WriteError(w, &model.APIError{Code: http.StatusBadRequest, Message: "file too large (max 2 MB)"})
		return
	}

	file, _, err := r.FormFile("avatar")
	if err != nil {
		model.WriteError(w, &model.APIError{Code: http.StatusBadRequest, Message: "avatar file is required"})
		return
	}
	defer file.Close()

	// Detect content type from file bytes
	buf := make([]byte, 512)
	n, err := file.Read(buf)
	if err != nil && err != io.EOF {
		model.WriteError(w, model.ErrInternalServer)
		return
	}
	contentType := http.DetectContentType(buf[:n])

	ext, ok := allowedImageTypes[contentType]
	if !ok {
		model.WriteError(w, &model.APIError{Code: http.StatusBadRequest, Message: "file must be a JPEG, PNG, GIF, or WebP image"})
		return
	}

	// Seek back to start
	if seeker, ok := file.(io.Seeker); ok {
		seeker.Seek(0, io.SeekStart)
	}

	filename := fmt.Sprintf("avatar-%s%s", u.UserID, ext)
	var avatarURL string

	if h.r2 != nil {
		// Production: upload to R2
		key := "avatars/" + filename
		url, err := h.r2.Upload(r.Context(), key, file, contentType)
		if err != nil {
			model.WriteError(w, model.ErrInternalServer)
			return
		}
		avatarURL = url
	} else {
		// Dev fallback: save to local disk
		// Remove old avatar files for this user
		oldPattern := filepath.Join(h.uploadDir, fmt.Sprintf("avatar-%s.*", u.UserID))
		if matches, err := filepath.Glob(oldPattern); err == nil {
			for _, m := range matches {
				os.Remove(m)
			}
		}

		destPath := filepath.Join(h.uploadDir, filename)
		dst, err := os.Create(destPath)
		if err != nil {
			model.WriteError(w, model.ErrInternalServer)
			return
		}
		defer dst.Close()

		if _, err := io.Copy(dst, file); err != nil {
			model.WriteError(w, model.ErrInternalServer)
			return
		}
		avatarURL = "/uploads/" + filename
	}

	user, err := h.store.UpdateUser(r.Context(), u.UserID, "", "", nil, &avatarURL)
	if err != nil {
		model.WriteError(w, model.ErrInternalServer)
		return
	}
	model.WriteJSON(w, http.StatusOK, user)
}

func (h *UsersHandler) PublicProfile(w http.ResponseWriter, r *http.Request) {
	username := chi.URLParam(r, "username")
	profile, err := h.store.GetPublicProfile(r.Context(), username)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			model.WriteError(w, model.ErrNotFound)
			return
		}
		model.WriteError(w, model.ErrInternalServer)
		return
	}
	model.WriteJSON(w, http.StatusOK, profile)
}

func (h *UsersHandler) MediaCollections(w http.ResponseWriter, r *http.Request) {
	u := auth.GetUser(r)
	mediaID := chi.URLParam(r, "id")
	cols, err := h.store.GetCollectionsForMediaItem(r.Context(), u.UserID, mediaID)
	if err != nil {
		model.WriteError(w, model.ErrInternalServer)
		return
	}
	if cols == nil {
		cols = []store.Collection{}
	}
	model.WriteJSON(w, http.StatusOK, cols)
}

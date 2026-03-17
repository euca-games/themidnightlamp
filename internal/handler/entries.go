package handler

import (
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"themidnightlamp/internal/auth"
	"themidnightlamp/internal/model"
	"themidnightlamp/internal/sanitize"
	"themidnightlamp/internal/store"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"
)

type EntriesHandler struct {
	store *store.Store
}

func NewEntriesHandler(s *store.Store) *EntriesHandler {
	return &EntriesHandler{store: s}
}

func (h *EntriesHandler) ListByUser(w http.ResponseWriter, r *http.Request) {
	u := auth.GetUser(r)
	q := r.URL.Query()
	entries, err := h.store.ListEntriesByUser(r.Context(), u.UserID, q.Get("type"), q.Get("status"))
	if err != nil {
		model.WriteError(w, model.ErrInternalServer)
		return
	}
	if entries == nil {
		entries = []store.EntryWithMedia{}
	}
	model.WriteJSON(w, http.StatusOK, entries)
}

func (h *EntriesHandler) ListByCollection(w http.ResponseWriter, r *http.Request) {
	u := auth.GetUser(r)
	collectionID := chi.URLParam(r, "id")

	col, err := h.store.GetCollection(r.Context(), collectionID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			model.WriteError(w, model.ErrNotFound)
			return
		}
		model.WriteError(w, model.ErrInternalServer)
		return
	}
	if col.UserID.String() != u.UserID && !col.IsPublic {
		model.WriteError(w, model.ErrForbidden)
		return
	}

	entries, err := h.store.ListEntriesByCollection(r.Context(), collectionID)
	if err != nil {
		model.WriteError(w, model.ErrInternalServer)
		return
	}
	if entries == nil {
		entries = []store.EntryWithMedia{}
	}
	model.WriteJSON(w, http.StatusOK, entries)
}

type entryRequest struct {
	MediaItemID string           `json:"media_item_id"`
	Rating      *float64         `json:"rating"`
	RatingRaw   *json.RawMessage `json:"-"`
	Status      string           `json:"status"`
	Notes       *string          `json:"notes"`
	Review      *string          `json:"review"`
	StartedAt   *string          `json:"started_at"`
	CompletedAt *string          `json:"completed_at"`
}

func decodeEntryRequest(r *http.Request) (entryRequest, error) {
	var raw map[string]json.RawMessage
	if err := json.NewDecoder(r.Body).Decode(&raw); err != nil {
		return entryRequest{}, err
	}

	var req entryRequest
	if v, ok := raw["media_item_id"]; ok {
		json.Unmarshal(v, &req.MediaItemID)
	}
	if v, ok := raw["rating"]; ok {
		req.RatingRaw = &v
		json.Unmarshal(v, &req.Rating)
	}
	if v, ok := raw["status"]; ok {
		json.Unmarshal(v, &req.Status)
	}
	if v, ok := raw["notes"]; ok {
		json.Unmarshal(v, &req.Notes)
	}
	if v, ok := raw["review"]; ok {
		json.Unmarshal(v, &req.Review)
	}
	if v, ok := raw["started_at"]; ok {
		json.Unmarshal(v, &req.StartedAt)
	}
	if v, ok := raw["completed_at"]; ok {
		json.Unmarshal(v, &req.CompletedAt)
	}
	return req, nil
}

func sanitizeEntryRequest(req *entryRequest) *model.APIError {
	if req.Notes != nil && *req.Notes != "" {
		cleaned, ok := sanitize.Text(*req.Notes, 1000)
		if !ok {
			return &model.APIError{Code: http.StatusBadRequest, Message: "notes contain invalid content or exceed 1000 characters"}
		}
		req.Notes = &cleaned
	}
	if req.Review != nil && *req.Review != "" {
		cleaned, ok := sanitize.Text(*req.Review, 5000)
		if !ok {
			return &model.APIError{Code: http.StatusBadRequest, Message: "review contains invalid content or exceeds 5000 characters"}
		}
		req.Review = &cleaned
	}
	return nil
}

func (h *EntriesHandler) Create(w http.ResponseWriter, r *http.Request) {
	u := auth.GetUser(r)
	collectionID := chi.URLParam(r, "id")

	col, err := h.store.GetCollection(r.Context(), collectionID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			model.WriteError(w, model.ErrNotFound)
			return
		}
		model.WriteError(w, model.ErrInternalServer)
		return
	}
	if col.UserID.String() != u.UserID {
		model.WriteError(w, model.ErrForbidden)
		return
	}

	req, decErr := decodeEntryRequest(r)
	if decErr != nil {
		model.WriteError(w, model.ErrBadRequest)
		return
	}
	if req.MediaItemID == "" {
		model.WriteError(w, &model.APIError{Code: http.StatusBadRequest, Message: "media_item_id is required"})
		return
	}
	if req.Status == "" {
		req.Status = "want"
	}

	if apiErr := sanitizeEntryRequest(&req); apiErr != nil {
		model.WriteError(w, apiErr)
		return
	}

	startedAt, completedAt := parseDates(req.StartedAt, req.CompletedAt)
	entry, err := h.store.CreateEntry(r.Context(), collectionID, req.MediaItemID, req.Rating, req.Status, req.Notes, req.Review, startedAt, completedAt)
	if err != nil {
		model.WriteError(w, &model.APIError{Code: http.StatusConflict, Message: "item already in collection"})
		return
	}
	model.WriteJSON(w, http.StatusCreated, entry)
}

func (h *EntriesHandler) Update(w http.ResponseWriter, r *http.Request) {
	u := auth.GetUser(r)
	entryID := chi.URLParam(r, "entryId")

	entry, err := h.store.GetEntry(r.Context(), entryID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			model.WriteError(w, model.ErrNotFound)
			return
		}
		model.WriteError(w, model.ErrInternalServer)
		return
	}

	col, err := h.store.GetCollection(r.Context(), entry.CollectionID.String())
	if err != nil {
		model.WriteError(w, model.ErrInternalServer)
		return
	}
	if col.UserID.String() != u.UserID {
		model.WriteError(w, model.ErrForbidden)
		return
	}

	req, decErr := decodeEntryRequest(r)
	if decErr != nil {
		model.WriteError(w, model.ErrBadRequest)
		return
	}

	if apiErr := sanitizeEntryRequest(&req); apiErr != nil {
		model.WriteError(w, apiErr)
		return
	}

	// clearRating: the frontend explicitly sent "rating": null (key present, value null)
	clearRating := req.RatingRaw != nil && req.Rating == nil

	startedAt, completedAt := parseDates(req.StartedAt, req.CompletedAt)
	updated, err := h.store.UpdateEntry(r.Context(), entryID, req.Rating, req.Status, req.Notes, req.Review, startedAt, completedAt, clearRating)
	if err != nil {
		model.WriteError(w, model.ErrInternalServer)
		return
	}
	model.WriteJSON(w, http.StatusOK, updated)
}

func (h *EntriesHandler) Delete(w http.ResponseWriter, r *http.Request) {
	u := auth.GetUser(r)
	entryID := chi.URLParam(r, "entryId")

	entry, err := h.store.GetEntry(r.Context(), entryID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			model.WriteError(w, model.ErrNotFound)
			return
		}
		model.WriteError(w, model.ErrInternalServer)
		return
	}

	col, err := h.store.GetCollection(r.Context(), entry.CollectionID.String())
	if err != nil {
		model.WriteError(w, model.ErrInternalServer)
		return
	}
	if col.UserID.String() != u.UserID {
		model.WriteError(w, model.ErrForbidden)
		return
	}

	if err := h.store.DeleteEntry(r.Context(), entryID); err != nil {
		model.WriteError(w, model.ErrInternalServer)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func parseDates(startedAt, completedAt *string) (*time.Time, *time.Time) {
	var s, c *time.Time
	if startedAt != nil && *startedAt != "" {
		t, err := time.Parse("2006-01-02", *startedAt)
		if err == nil {
			s = &t
		}
	}
	if completedAt != nil && *completedAt != "" {
		t, err := time.Parse("2006-01-02", *completedAt)
		if err == nil {
			c = &t
		}
	}
	return s, c
}

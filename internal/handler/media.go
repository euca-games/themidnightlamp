package handler

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

	"themidnightlamp/internal/model"
	"themidnightlamp/internal/store"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"
)

type MediaHandler struct {
	store *store.Store
}

func NewMediaHandler(s *store.Store) *MediaHandler {
	return &MediaHandler{store: s}
}

func (h *MediaHandler) List(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	limit, _ := strconv.Atoi(q.Get("limit"))
	page, _ := strconv.Atoi(q.Get("page"))
	if limit <= 0 {
		limit = 20
	}
	if page <= 0 {
		page = 1
	}

	items, count, err := h.store.ListMediaItems(r.Context(), store.ListMediaParams{
		MediaType: q.Get("type"),
		Query:     q.Get("q"),
		Limit:     limit,
		Offset:    (page - 1) * limit,
	})
	if err != nil {
		model.WriteError(w, model.ErrInternalServer)
		return
	}

	model.WriteJSON(w, http.StatusOK, map[string]any{
		"items": items,
		"total": count,
		"page":  page,
		"limit": limit,
	})
}

func (h *MediaHandler) Get(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	item, err := h.store.GetMediaItem(r.Context(), id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			model.WriteError(w, model.ErrNotFound)
			return
		}
		model.WriteError(w, model.ErrInternalServer)
		return
	}
	model.WriteJSON(w, http.StatusOK, item)
}

func (h *MediaHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Type     string          `json:"type"`
		Title    string          `json:"title"`
		Metadata json.RawMessage `json:"metadata"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		model.WriteError(w, model.ErrBadRequest)
		return
	}
	if req.Type == "" || req.Title == "" {
		model.WriteError(w, &model.APIError{Code: http.StatusBadRequest, Message: "type and title are required"})
		return
	}

	item, err := h.store.CreateMediaItem(r.Context(), req.Type, req.Title, req.Metadata)
	if err != nil {
		model.WriteError(w, model.ErrInternalServer)
		return
	}
	model.WriteJSON(w, http.StatusCreated, item)
}

func (h *MediaHandler) Update(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var req struct {
		Title    string          `json:"title"`
		Metadata json.RawMessage `json:"metadata"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		model.WriteError(w, model.ErrBadRequest)
		return
	}

	item, err := h.store.UpdateMediaItem(r.Context(), id, req.Title, req.Metadata)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			model.WriteError(w, model.ErrNotFound)
			return
		}
		model.WriteError(w, model.ErrInternalServer)
		return
	}
	model.WriteJSON(w, http.StatusOK, item)
}

func (h *MediaHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if err := h.store.DeleteMediaItem(r.Context(), id); err != nil {
		model.WriteError(w, model.ErrInternalServer)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

package handler

import (
	"encoding/json"
	"errors"
	"net/http"

	"themidnightlamp/internal/auth"
	"themidnightlamp/internal/model"
	"themidnightlamp/internal/store"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"
)

type CollectionsHandler struct {
	store *store.Store
}

func NewCollectionsHandler(s *store.Store) *CollectionsHandler {
	return &CollectionsHandler{store: s}
}

func (h *CollectionsHandler) List(w http.ResponseWriter, r *http.Request) {
	u := auth.GetUser(r)
	cols, err := h.store.ListCollectionsByUser(r.Context(), u.UserID, r.URL.Query().Get("type"))
	if err != nil {
		model.WriteError(w, model.ErrInternalServer)
		return
	}
	if cols == nil {
		cols = []store.Collection{}
	}
	model.WriteJSON(w, http.StatusOK, cols)
}

func (h *CollectionsHandler) Get(w http.ResponseWriter, r *http.Request) {
	u := auth.GetUser(r)
	id := chi.URLParam(r, "id")
	col, err := h.store.GetCollection(r.Context(), id)
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
	model.WriteJSON(w, http.StatusOK, col)
}

func (h *CollectionsHandler) Create(w http.ResponseWriter, r *http.Request) {
	u := auth.GetUser(r)
	var req struct {
		Name        string  `json:"name"`
		Type        string  `json:"type"`
		Description *string `json:"description"`
		IsPublic    bool    `json:"is_public"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		model.WriteError(w, model.ErrBadRequest)
		return
	}
	if req.Name == "" || req.Type == "" {
		model.WriteError(w, &model.APIError{Code: http.StatusBadRequest, Message: "name and type are required"})
		return
	}

	col, err := h.store.CreateCollection(r.Context(), u.UserID, req.Name, req.Type, req.Description, req.IsPublic)
	if err != nil {
		model.WriteError(w, &model.APIError{Code: http.StatusConflict, Message: "collection with that name and type already exists"})
		return
	}
	model.WriteJSON(w, http.StatusCreated, col)
}

func (h *CollectionsHandler) Update(w http.ResponseWriter, r *http.Request) {
	u := auth.GetUser(r)
	id := chi.URLParam(r, "id")

	col, err := h.store.GetCollection(r.Context(), id)
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

	var req struct {
		Name        string  `json:"name"`
		Description *string `json:"description"`
		IsPublic    bool    `json:"is_public"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		model.WriteError(w, model.ErrBadRequest)
		return
	}

	updated, err := h.store.UpdateCollection(r.Context(), id, req.Name, req.Description, req.IsPublic)
	if err != nil {
		model.WriteError(w, model.ErrInternalServer)
		return
	}
	model.WriteJSON(w, http.StatusOK, updated)
}

func (h *CollectionsHandler) Delete(w http.ResponseWriter, r *http.Request) {
	u := auth.GetUser(r)
	id := chi.URLParam(r, "id")

	col, err := h.store.GetCollection(r.Context(), id)
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

	if err := h.store.DeleteCollection(r.Context(), id); err != nil {
		model.WriteError(w, model.ErrInternalServer)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *CollectionsHandler) PublicByUsername(w http.ResponseWriter, r *http.Request) {
	username := chi.URLParam(r, "username")
	cols, err := h.store.GetPublicCollectionsByUsername(r.Context(), username)
	if err != nil {
		model.WriteError(w, model.ErrInternalServer)
		return
	}
	if cols == nil {
		cols = []store.Collection{}
	}
	model.WriteJSON(w, http.StatusOK, cols)
}

func (h *CollectionsHandler) PublicOne(w http.ResponseWriter, r *http.Request) {
	username := chi.URLParam(r, "username")
	id := chi.URLParam(r, "id")
	col, err := h.store.GetPublicCollection(r.Context(), username, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			model.WriteError(w, model.ErrNotFound)
			return
		}
		model.WriteError(w, model.ErrInternalServer)
		return
	}
	model.WriteJSON(w, http.StatusOK, col)
}

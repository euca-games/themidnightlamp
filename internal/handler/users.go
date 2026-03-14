package handler

import (
	"encoding/json"
	"errors"
	"net/http"

	"themidnightlamp/internal/auth"
	"themidnightlamp/internal/model"
	"themidnightlamp/internal/store"

	"github.com/jackc/pgx/v5"
)

type UsersHandler struct {
	store *store.Store
}

func NewUsersHandler(s *store.Store) *UsersHandler {
	return &UsersHandler{store: s}
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
		Username string `json:"username"`
		Email    string `json:"email"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		model.WriteError(w, model.ErrBadRequest)
		return
	}

	user, err := h.store.UpdateUser(r.Context(), u.UserID, req.Username, req.Email)
	if err != nil {
		model.WriteError(w, model.ErrInternalServer)
		return
	}
	model.WriteJSON(w, http.StatusOK, user)
}

package handler

import (
	"net/http"

	"themidnightlamp/internal/igdb"
	"themidnightlamp/internal/model"
)

type SearchHandler struct {
	igdb *igdb.Client
}

func NewSearchHandler(c *igdb.Client) *SearchHandler {
	return &SearchHandler{igdb: c}
}

func (h *SearchHandler) SearchGames(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query().Get("q")
	if len(q) < 2 {
		model.WriteError(w, &model.APIError{Code: http.StatusBadRequest, Message: "q must be at least 2 characters"})
		return
	}

	results, err := h.igdb.SearchGames(r.Context(), q, 8)
	if err != nil {
		model.WriteError(w, model.ErrInternalServer)
		return
	}

	model.WriteJSON(w, http.StatusOK, results)
}

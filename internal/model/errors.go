package model

import (
	"encoding/json"
	"net/http"
)

type APIError struct {
	Code    int    `json:"-"`
	Message string `json:"error"`
}

func (e *APIError) Error() string { return e.Message }

var (
	ErrUnauthorized    = &APIError{Code: http.StatusUnauthorized, Message: "unauthorized"}
	ErrForbidden       = &APIError{Code: http.StatusForbidden, Message: "forbidden"}
	ErrNotFound        = &APIError{Code: http.StatusNotFound, Message: "not found"}
	ErrConflict        = &APIError{Code: http.StatusConflict, Message: "conflict"}
	ErrBadRequest      = &APIError{Code: http.StatusBadRequest, Message: "bad request"}
	ErrInternalServer  = &APIError{Code: http.StatusInternalServerError, Message: "internal server error"}
)

func WriteError(w http.ResponseWriter, err *APIError) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(err.Code)
	json.NewEncoder(w).Encode(err)
}

func WriteJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

package model

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestAPIError_Error(t *testing.T) {
	err := &APIError{Code: 400, Message: "bad request"}
	if err.Error() != "bad request" {
		t.Fatalf("expected 'bad request', got %q", err.Error())
	}
}

func TestWriteError(t *testing.T) {
	w := httptest.NewRecorder()
	WriteError(w, ErrNotFound)

	if w.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d", w.Code)
	}
	if ct := w.Header().Get("Content-Type"); ct != "application/json" {
		t.Fatalf("expected application/json, got %q", ct)
	}

	var body struct {
		Error string `json:"error"`
	}
	json.NewDecoder(w.Body).Decode(&body)
	if body.Error != "not found" {
		t.Fatalf("expected 'not found', got %q", body.Error)
	}
}

func TestWriteJSON(t *testing.T) {
	w := httptest.NewRecorder()
	WriteJSON(w, http.StatusCreated, map[string]string{"key": "value"})

	if w.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d", w.Code)
	}

	var body map[string]string
	json.NewDecoder(w.Body).Decode(&body)
	if body["key"] != "value" {
		t.Fatalf("expected 'value', got %q", body["key"])
	}
}

func TestPredefinedErrors(t *testing.T) {
	tests := []struct {
		err  *APIError
		code int
		msg  string
	}{
		{ErrUnauthorized, 401, "unauthorized"},
		{ErrForbidden, 403, "forbidden"},
		{ErrNotFound, 404, "not found"},
		{ErrConflict, 409, "conflict"},
		{ErrBadRequest, 400, "bad request"},
		{ErrInternalServer, 500, "internal server error"},
	}
	for _, tt := range tests {
		if tt.err.Code != tt.code {
			t.Errorf("%s: expected code %d, got %d", tt.msg, tt.code, tt.err.Code)
		}
		if tt.err.Message != tt.msg {
			t.Errorf("expected message %q, got %q", tt.msg, tt.err.Message)
		}
	}
}

package auth

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestRequireAuth_NoCookie(t *testing.T) {
	handler := RequireAuth(testSecret)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Fatal("handler should not be called")
	}))

	req := httptest.NewRequest("GET", "/", nil)
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", w.Code)
	}
}

func TestRequireAuth_InvalidToken(t *testing.T) {
	handler := RequireAuth(testSecret)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Fatal("handler should not be called")
	}))

	req := httptest.NewRequest("GET", "/", nil)
	req.AddCookie(&http.Cookie{Name: "access_token", Value: "invalid-token"})
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", w.Code)
	}
}

func TestRequireAuth_ValidToken(t *testing.T) {
	token, _ := GenerateAccessToken("user-123", "testuser", testSecret)

	var gotUser *UserContext
	handler := RequireAuth(testSecret)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotUser = GetUser(r)
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest("GET", "/", nil)
	req.AddCookie(&http.Cookie{Name: "access_token", Value: token})
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
	if gotUser == nil {
		t.Fatal("expected user context to be set")
	}
	if gotUser.UserID != "user-123" {
		t.Fatalf("expected user_id 'user-123', got %q", gotUser.UserID)
	}
	if gotUser.Username != "testuser" {
		t.Fatalf("expected username 'testuser', got %q", gotUser.Username)
	}
}

func TestGetUser_NoContext(t *testing.T) {
	req := httptest.NewRequest("GET", "/", nil)
	user := GetUser(req)
	if user != nil {
		t.Fatal("expected nil user when no context is set")
	}
}

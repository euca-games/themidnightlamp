package handler

import (
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"themidnightlamp/internal/auth"
	"themidnightlamp/internal/model"
	"themidnightlamp/internal/store"

	"github.com/jackc/pgx/v5"
	"golang.org/x/crypto/bcrypt"
)

type AuthHandler struct {
	store            *store.Store
	jwtSecret        string
	jwtRefreshSecret string
}

func NewAuthHandler(s *store.Store, jwtSecret, jwtRefreshSecret string) *AuthHandler {
	return &AuthHandler{store: s, jwtSecret: jwtSecret, jwtRefreshSecret: jwtRefreshSecret}
}

type registerRequest struct {
	Username string `json:"username"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req registerRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		model.WriteError(w, model.ErrBadRequest)
		return
	}
	if req.Username == "" || req.Email == "" || req.Password == "" {
		model.WriteError(w, &model.APIError{Code: http.StatusBadRequest, Message: "username, email, and password are required"})
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		model.WriteError(w, model.ErrInternalServer)
		return
	}

	user, err := h.store.CreateUser(r.Context(), req.Username, req.Email, string(hash))
	if err != nil {
		model.WriteError(w, &model.APIError{Code: http.StatusConflict, Message: "username or email already taken"})
		return
	}

	h.issueTokens(w, r, user)
}

type loginRequest struct {
	Identifier string `json:"identifier"`
	Password   string `json:"password"`
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req loginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		model.WriteError(w, model.ErrBadRequest)
		return
	}

	user, err := h.store.GetUserByEmailOrUsername(r.Context(), req.Identifier)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			model.WriteError(w, &model.APIError{Code: http.StatusUnauthorized, Message: "invalid credentials"})
			return
		}
		model.WriteError(w, model.ErrInternalServer)
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		model.WriteError(w, &model.APIError{Code: http.StatusUnauthorized, Message: "invalid credentials"})
		return
	}

	h.issueTokens(w, r, user)
}

func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie("refresh_token")
	if err == nil {
		h.store.DeleteRefreshToken(r.Context(), cookie.Value)
	}

	http.SetCookie(w, &http.Cookie{Name: "access_token", Value: "", MaxAge: -1, HttpOnly: true, Path: "/"})
	http.SetCookie(w, &http.Cookie{Name: "refresh_token", Value: "", MaxAge: -1, HttpOnly: true, Path: "/"})
	w.WriteHeader(http.StatusNoContent)
}

func (h *AuthHandler) Refresh(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie("refresh_token")
	if err != nil {
		model.WriteError(w, model.ErrUnauthorized)
		return
	}

	rt, err := h.store.GetRefreshToken(r.Context(), cookie.Value)
	if err != nil {
		model.WriteError(w, model.ErrUnauthorized)
		return
	}

	if err := h.store.DeleteRefreshToken(r.Context(), cookie.Value); err != nil {
		model.WriteError(w, model.ErrInternalServer)
		return
	}

	user, err := h.store.GetUserByID(r.Context(), rt.UserID.String())
	if err != nil {
		model.WriteError(w, model.ErrInternalServer)
		return
	}

	h.issueTokens(w, r, user)
}

func (h *AuthHandler) issueTokens(w http.ResponseWriter, r *http.Request, user *store.User) {
	accessToken, err := auth.GenerateAccessToken(user.ID.String(), user.Username, h.jwtSecret)
	if err != nil {
		model.WriteError(w, model.ErrInternalServer)
		return
	}

	refreshToken, err := auth.GenerateRefreshTokenString()
	if err != nil {
		model.WriteError(w, model.ErrInternalServer)
		return
	}

	expiresAt := time.Now().Add(auth.RefreshTokenDuration)
	if _, err := h.store.CreateRefreshToken(r.Context(), user.ID.String(), refreshToken, expiresAt); err != nil {
		model.WriteError(w, model.ErrInternalServer)
		return
	}

	secure := r.TLS != nil
	http.SetCookie(w, &http.Cookie{
		Name:     "access_token",
		Value:    accessToken,
		HttpOnly: true,
		Secure:   secure,
		Path:     "/",
		MaxAge:   int(auth.AccessTokenDuration.Seconds()),
		SameSite: http.SameSiteLaxMode,
	})
	http.SetCookie(w, &http.Cookie{
		Name:     "refresh_token",
		Value:    refreshToken,
		HttpOnly: true,
		Secure:   secure,
		Path:     "/api/v1/auth/refresh",
		MaxAge:   int(auth.RefreshTokenDuration.Seconds()),
		SameSite: http.SameSiteLaxMode,
	})

	model.WriteJSON(w, http.StatusOK, map[string]any{
		"id":         user.ID,
		"username":   user.Username,
		"email":      user.Email,
		"created_at": user.CreatedAt,
	})
}

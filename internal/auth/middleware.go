package auth

import (
	"context"
	"net/http"
	"themidnightlamp/internal/model"
)

type contextKey string

const UserContextKey contextKey = "user"

type UserContext struct {
	UserID   string
	Username string
}

func RequireAuth(jwtSecret string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			cookie, err := r.Cookie("access_token")
			if err != nil {
				model.WriteError(w, model.ErrUnauthorized)
				return
			}

			claims, err := ValidateAccessToken(cookie.Value, jwtSecret)
			if err != nil {
				model.WriteError(w, model.ErrUnauthorized)
				return
			}

			ctx := context.WithValue(r.Context(), UserContextKey, &UserContext{
				UserID:   claims.UserID,
				Username: claims.Username,
			})
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func GetUser(r *http.Request) *UserContext {
	u, _ := r.Context().Value(UserContextKey).(*UserContext)
	return u
}

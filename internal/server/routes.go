package server

import (
	"context"
	"embed"
	"io/fs"
	"net/http"
	"strings"

	"themidnightlamp/internal/auth"
	"themidnightlamp/internal/config"
	"themidnightlamp/internal/handler"
	"themidnightlamp/internal/igdb"
	"themidnightlamp/internal/store"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
)

type Server struct {
	router *chi.Mux
}

func New(ctx context.Context, cfg *config.Config, s *store.Store, webFS embed.FS) *Server {
	r := chi.NewRouter()

	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.RequestID)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"http://localhost:5173", "https://themidnightlamp.com"},
		AllowedMethods:   []string{"GET", "POST", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Content-Type", "Authorization"},
		AllowCredentials: true,
	}))

	authH := handler.NewAuthHandler(s, cfg.JWTSecret, cfg.JWTRefreshSecret)
	usersH := handler.NewUsersHandler(s)
	mediaH := handler.NewMediaHandler(s)
	colsH := handler.NewCollectionsHandler(s)
	entriesH := handler.NewEntriesHandler(s)
	igdbClient := igdb.NewClient(cfg.IGDBClientID, cfg.IGDBClientSecret)
	searchH := handler.NewSearchHandler(igdbClient)

	r.Route("/api/v1", func(r chi.Router) {
		r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
			w.Write([]byte("ok"))
		})

		// Auth (public)
		r.Post("/auth/register", authH.Register)
		r.Post("/auth/login", authH.Login)
		r.Post("/auth/logout", authH.Logout)
		r.Post("/auth/refresh", authH.Refresh)

		// Public user profiles
		r.Get("/users/{username}/collections", colsH.PublicByUsername)
		r.Get("/users/{username}/collections/{id}", colsH.PublicOne)

		// Protected routes
		r.Group(func(r chi.Router) {
			r.Use(auth.RequireAuth(cfg.JWTSecret))

			r.Get("/users/me", usersH.Me)
			r.Patch("/users/me", usersH.UpdateMe)

			r.Get("/search/games", searchH.SearchGames)
			r.Get("/entries", entriesH.ListByUser)

			r.Get("/media", mediaH.List)
			r.Get("/media/{id}", mediaH.Get)
			r.Post("/media", mediaH.Create)
			r.Patch("/media/{id}", mediaH.Update)
			r.Delete("/media/{id}", mediaH.Delete)

			r.Get("/collections", colsH.List)
			r.Get("/collections/{id}", colsH.Get)
			r.Post("/collections", colsH.Create)
			r.Patch("/collections/{id}", colsH.Update)
			r.Delete("/collections/{id}", colsH.Delete)

			r.Get("/collections/{id}/entries", entriesH.ListByCollection)
			r.Post("/collections/{id}/entries", entriesH.Create)
			r.Patch("/collections/{id}/entries/{entryId}", entriesH.Update)
			r.Delete("/collections/{id}/entries/{entryId}", entriesH.Delete)
		})
	})

	// Serve SPA
	distFS, _ := fs.Sub(webFS, "web/dist")
	fileServer := http.FileServer(http.FS(distFS))
	r.Get("/*", func(w http.ResponseWriter, r *http.Request) {
		// Try static file first; fall back to index.html for SPA routing
		path := strings.TrimPrefix(r.URL.Path, "/")
		if _, err := fs.Stat(distFS, path); err != nil || path == "" {
			// Serve index.html for client-side routing
			r.URL.Path = "/"
		}
		fileServer.ServeHTTP(w, r)
	})

	return &Server{router: r}
}

func (s *Server) Handler() http.Handler { return s.router }

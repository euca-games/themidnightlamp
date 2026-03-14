package main

import (
	"context"
	"embed"
	"fmt"
	"log"
	"net/http"
	"os"

	"themidnightlamp/internal/config"
	"themidnightlamp/internal/db"
	"themidnightlamp/internal/server"
	"themidnightlamp/internal/store"

	"github.com/joho/godotenv"
)

//go:embed all:web/dist
var webFS embed.FS

func main() {
	_ = godotenv.Load()

	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config: %v", err)
	}

	ctx := context.Background()
	pool, err := db.NewPool(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("db: %v", err)
	}
	defer pool.Close()

	if len(os.Args) > 1 && os.Args[1] == "migrate" {
		if err := db.RunMigrations(ctx, pool); err != nil {
			log.Fatalf("migrate: %v", err)
		}
		fmt.Println("migrations complete")
		return
	}

	if err := db.RunMigrations(ctx, pool); err != nil {
		log.Fatalf("migrate: %v", err)
	}

	s := store.New(pool)
	srv := server.New(ctx, cfg, s, webFS)

	addr := ":" + cfg.Port
	log.Printf("listening on %s", addr)
	if err := http.ListenAndServe(addr, srv.Handler()); err != nil {
		log.Fatal(err)
	}
}

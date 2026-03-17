package config

import (
	"fmt"
	"os"
)

type Config struct {
	DatabaseURL        string
	JWTSecret          string
	JWTRefreshSecret   string
	Port               string
	GoEnv              string
	IGDBClientID       string
	IGDBClientSecret   string
	UploadDir          string
	R2AccountID        string
	R2AccessKey        string
	R2SecretKey        string
	R2Bucket           string
	R2PublicURL        string
}

func Load() (*Config, error) {
	cfg := &Config{
		DatabaseURL:      os.Getenv("DATABASE_URL"),
		JWTSecret:        os.Getenv("JWT_SECRET"),
		JWTRefreshSecret: os.Getenv("JWT_REFRESH_SECRET"),
		Port:             getEnvOrDefault("PORT", "8080"),
		GoEnv:            getEnvOrDefault("GO_ENV", "development"),
		IGDBClientID:     os.Getenv("IGDB_CLIENT_ID"),
		IGDBClientSecret: os.Getenv("IGDB_CLIENT_SECRET"),
		UploadDir:        getEnvOrDefault("UPLOAD_DIR", "uploads"),
		R2AccountID:      os.Getenv("R2_ACCOUNT_ID"),
		R2AccessKey:      os.Getenv("R2_ACCESS_KEY"),
		R2SecretKey:      os.Getenv("R2_SECRET_KEY"),
		R2Bucket:         os.Getenv("R2_BUCKET"),
		R2PublicURL:      os.Getenv("R2_PUBLIC_URL"),
	}

	if cfg.DatabaseURL == "" {
		return nil, fmt.Errorf("DATABASE_URL is required")
	}
	if cfg.JWTSecret == "" {
		return nil, fmt.Errorf("JWT_SECRET is required")
	}
	if cfg.JWTRefreshSecret == "" {
		return nil, fmt.Errorf("JWT_REFRESH_SECRET is required")
	}

	return cfg, nil
}

func getEnvOrDefault(key, defaultVal string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return defaultVal
}

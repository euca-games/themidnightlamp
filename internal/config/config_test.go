package config

import (
	"os"
	"testing"
)

func TestLoad_MissingDatabaseURL(t *testing.T) {
	os.Setenv("DATABASE_URL", "")
	os.Setenv("JWT_SECRET", "test-secret-that-is-long-enough")
	os.Setenv("JWT_REFRESH_SECRET", "test-refresh-secret-long-enough")
	defer func() {
		os.Unsetenv("DATABASE_URL")
		os.Unsetenv("JWT_SECRET")
		os.Unsetenv("JWT_REFRESH_SECRET")
	}()

	_, err := Load()
	if err == nil {
		t.Fatal("expected error for missing DATABASE_URL")
	}
}

func TestLoad_MissingJWTSecret(t *testing.T) {
	os.Setenv("DATABASE_URL", "postgres://localhost/test")
	os.Setenv("JWT_SECRET", "")
	os.Setenv("JWT_REFRESH_SECRET", "test-refresh-secret-long-enough")
	defer func() {
		os.Unsetenv("DATABASE_URL")
		os.Unsetenv("JWT_SECRET")
		os.Unsetenv("JWT_REFRESH_SECRET")
	}()

	_, err := Load()
	if err == nil {
		t.Fatal("expected error for missing JWT_SECRET")
	}
}

func TestLoad_MissingJWTRefreshSecret(t *testing.T) {
	os.Setenv("DATABASE_URL", "postgres://localhost/test")
	os.Setenv("JWT_SECRET", "test-secret-that-is-long-enough")
	os.Setenv("JWT_REFRESH_SECRET", "")
	defer func() {
		os.Unsetenv("DATABASE_URL")
		os.Unsetenv("JWT_SECRET")
		os.Unsetenv("JWT_REFRESH_SECRET")
	}()

	_, err := Load()
	if err == nil {
		t.Fatal("expected error for missing JWT_REFRESH_SECRET")
	}
}

func TestLoad_Success(t *testing.T) {
	os.Setenv("DATABASE_URL", "postgres://localhost/test")
	os.Setenv("JWT_SECRET", "test-secret-that-is-long-enough")
	os.Setenv("JWT_REFRESH_SECRET", "test-refresh-secret-long-enough")
	os.Setenv("PORT", "3000")
	os.Setenv("GO_ENV", "test")
	defer func() {
		os.Unsetenv("DATABASE_URL")
		os.Unsetenv("JWT_SECRET")
		os.Unsetenv("JWT_REFRESH_SECRET")
		os.Unsetenv("PORT")
		os.Unsetenv("GO_ENV")
	}()

	cfg, err := Load()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if cfg.Port != "3000" {
		t.Fatalf("expected port '3000', got %q", cfg.Port)
	}
	if cfg.GoEnv != "test" {
		t.Fatalf("expected env 'test', got %q", cfg.GoEnv)
	}
}

func TestLoad_DefaultPort(t *testing.T) {
	os.Setenv("DATABASE_URL", "postgres://localhost/test")
	os.Setenv("JWT_SECRET", "test-secret-that-is-long-enough")
	os.Setenv("JWT_REFRESH_SECRET", "test-refresh-secret-long-enough")
	os.Unsetenv("PORT")
	defer func() {
		os.Unsetenv("DATABASE_URL")
		os.Unsetenv("JWT_SECRET")
		os.Unsetenv("JWT_REFRESH_SECRET")
	}()

	cfg, err := Load()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if cfg.Port != "8080" {
		t.Fatalf("expected default port '8080', got %q", cfg.Port)
	}
}

func TestGetEnvOrDefault(t *testing.T) {
	os.Setenv("TEST_KEY_EXISTS", "value")
	defer os.Unsetenv("TEST_KEY_EXISTS")

	if v := getEnvOrDefault("TEST_KEY_EXISTS", "default"); v != "value" {
		t.Fatalf("expected 'value', got %q", v)
	}
	if v := getEnvOrDefault("TEST_KEY_MISSING", "default"); v != "default" {
		t.Fatalf("expected 'default', got %q", v)
	}
}

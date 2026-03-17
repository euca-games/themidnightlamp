package auth

import (
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

const testSecret = "test-secret-that-is-long-enough-for-hs256"

func TestGenerateAndValidateAccessToken(t *testing.T) {
	token, err := GenerateAccessToken("user-123", "testuser", testSecret)
	if err != nil {
		t.Fatalf("GenerateAccessToken: %v", err)
	}
	if token == "" {
		t.Fatal("expected non-empty token")
	}

	claims, err := ValidateAccessToken(token, testSecret)
	if err != nil {
		t.Fatalf("ValidateAccessToken: %v", err)
	}
	if claims.UserID != "user-123" {
		t.Fatalf("expected user_id 'user-123', got %q", claims.UserID)
	}
	if claims.Username != "testuser" {
		t.Fatalf("expected username 'testuser', got %q", claims.Username)
	}
}

func TestValidateAccessToken_WrongSecret(t *testing.T) {
	token, _ := GenerateAccessToken("user-123", "testuser", testSecret)
	_, err := ValidateAccessToken(token, "wrong-secret-that-is-different")
	if err == nil {
		t.Fatal("expected error with wrong secret")
	}
}

func TestValidateAccessToken_Expired(t *testing.T) {
	claims := Claims{
		UserID:   "user-123",
		Username: "testuser",
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(-1 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now().Add(-2 * time.Hour)),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenStr, _ := token.SignedString([]byte(testSecret))

	_, err := ValidateAccessToken(tokenStr, testSecret)
	if err == nil {
		t.Fatal("expected error for expired token")
	}
}

func TestValidateAccessToken_InvalidToken(t *testing.T) {
	_, err := ValidateAccessToken("not.a.token", testSecret)
	if err == nil {
		t.Fatal("expected error for invalid token")
	}
}

func TestGenerateRefreshTokenString(t *testing.T) {
	token, err := GenerateRefreshTokenString()
	if err != nil {
		t.Fatalf("GenerateRefreshTokenString: %v", err)
	}
	if len(token) != 64 { // 32 bytes hex encoded
		t.Fatalf("expected 64-char hex string, got %d chars", len(token))
	}

	// Ensure uniqueness
	token2, _ := GenerateRefreshTokenString()
	if token == token2 {
		t.Fatal("expected unique tokens")
	}
}

func TestAccessTokenDuration(t *testing.T) {
	if AccessTokenDuration != 15*time.Minute {
		t.Fatalf("expected 15 minutes, got %v", AccessTokenDuration)
	}
}

func TestRefreshTokenDuration(t *testing.T) {
	if RefreshTokenDuration != 7*24*time.Hour {
		t.Fatalf("expected 7 days, got %v", RefreshTokenDuration)
	}
}

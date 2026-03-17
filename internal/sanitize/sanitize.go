package sanitize

import (
	"regexp"
	"strings"
)

var (
	htmlTagRe      = regexp.MustCompile(`<[^>]*>`)
	dangerousURLRe = regexp.MustCompile(`(?i)(javascript|data|vbscript)\s*:`)
	sqlPatternRe   = regexp.MustCompile(`(?i)(--|;)\s*(DROP|ALTER|DELETE|INSERT|UPDATE|EXEC|UNION\s+SELECT|SELECT\s+.*\s+FROM)`)
	scriptTagRe    = regexp.MustCompile(`(?i)<\s*script`)
)

// Text sanitizes user-provided text by stripping HTML tags and checking
// for dangerous content. Returns the sanitized string and true if valid,
// or an empty string and false if the content is rejected.
func Text(input string, maxLen int) (string, bool) {
	// Strip HTML tags
	cleaned := htmlTagRe.ReplaceAllString(input, "")

	// Trim whitespace
	cleaned = strings.TrimSpace(cleaned)

	// Enforce max length
	if len(cleaned) > maxLen {
		return "", false
	}

	// Reject dangerous URL schemes
	if dangerousURLRe.MatchString(cleaned) {
		return "", false
	}

	// Reject SQL injection patterns
	if sqlPatternRe.MatchString(cleaned) {
		return "", false
	}

	// Reject script tags (even after stripping, check original)
	if scriptTagRe.MatchString(input) {
		return "", false
	}

	return cleaned, true
}

// URL validates and sanitizes a URL string. Only http(s) schemes are allowed.
func URL(input string, maxLen int) (string, bool) {
	input = strings.TrimSpace(input)
	if input == "" {
		return "", true
	}
	if len(input) > maxLen {
		return "", false
	}
	lower := strings.ToLower(input)
	if !strings.HasPrefix(lower, "http://") && !strings.HasPrefix(lower, "https://") {
		return "", false
	}
	if dangerousURLRe.MatchString(input) {
		return "", false
	}
	return input, true
}

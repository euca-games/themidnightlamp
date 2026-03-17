package sanitize

import "testing"

func TestText_Basic(t *testing.T) {
	result, ok := Text("hello world", 100)
	if !ok || result != "hello world" {
		t.Fatalf("expected 'hello world', got %q (ok=%v)", result, ok)
	}
}

func TestText_StripsHTML(t *testing.T) {
	result, ok := Text("<b>bold</b> text", 100)
	if !ok || result != "bold text" {
		t.Fatalf("expected 'bold text', got %q (ok=%v)", result, ok)
	}
}

func TestText_MaxLength(t *testing.T) {
	_, ok := Text("abc", 2)
	if ok {
		t.Fatal("expected failure for text exceeding max length")
	}
}

func TestText_ExactMaxLength(t *testing.T) {
	result, ok := Text("abc", 3)
	if !ok || result != "abc" {
		t.Fatalf("expected 'abc', got %q (ok=%v)", result, ok)
	}
}

func TestText_RejectsDangerousURL(t *testing.T) {
	_, ok := Text("click javascript:alert(1)", 100)
	if ok {
		t.Fatal("expected rejection of javascript: scheme")
	}
}

func TestText_RejectsDataScheme(t *testing.T) {
	_, ok := Text("visit data:text/html,<h1>hi</h1>", 100)
	if ok {
		t.Fatal("expected rejection of data: scheme")
	}
}

func TestText_RejectsSQLInjection(t *testing.T) {
	tests := []string{
		"'; DROP TABLE users;--",
		"-- DROP TABLE users",
		"; DELETE FROM collection_entries",
		"; UNION SELECT * FROM users",
	}
	for _, input := range tests {
		_, ok := Text(input, 1000)
		if ok {
			t.Fatalf("expected rejection of SQL injection: %q", input)
		}
	}
}

func TestText_RejectsScriptTag(t *testing.T) {
	_, ok := Text("<script>alert('xss')</script>", 1000)
	if ok {
		t.Fatal("expected rejection of script tag")
	}
}

func TestText_AllowsNormalContent(t *testing.T) {
	tests := []string{
		"This game is amazing! 10/10 would recommend.",
		"I played through it in about 40 hours. The story is great.",
		"Rating: 4.5/5 - Best RPG since 2020",
		"Pros:\n- Great graphics\n- Fun combat\nCons:\n- Short campaign",
	}
	for _, input := range tests {
		result, ok := Text(input, 5000)
		if !ok {
			t.Fatalf("expected valid content to pass: %q", input)
		}
		if result != input {
			t.Fatalf("expected %q, got %q", input, result)
		}
	}
}

func TestText_TrimsWhitespace(t *testing.T) {
	result, ok := Text("  hello  ", 100)
	if !ok || result != "hello" {
		t.Fatalf("expected 'hello', got %q", result)
	}
}

func TestText_EmptyString(t *testing.T) {
	result, ok := Text("", 100)
	if !ok || result != "" {
		t.Fatalf("expected empty string, got %q", result)
	}
}

func TestURL_ValidHTTPS(t *testing.T) {
	result, ok := URL("https://example.com/avatar.jpg", 2048)
	if !ok || result != "https://example.com/avatar.jpg" {
		t.Fatalf("expected valid URL, got %q (ok=%v)", result, ok)
	}
}

func TestURL_ValidHTTP(t *testing.T) {
	result, ok := URL("http://example.com/pic.png", 2048)
	if !ok || result != "http://example.com/pic.png" {
		t.Fatalf("expected valid URL, got %q (ok=%v)", result, ok)
	}
}

func TestURL_RejectsJavascript(t *testing.T) {
	_, ok := URL("javascript:alert(1)", 2048)
	if ok {
		t.Fatal("expected rejection of javascript: URL")
	}
}

func TestURL_RejectsInvalidScheme(t *testing.T) {
	_, ok := URL("ftp://example.com/file", 2048)
	if ok {
		t.Fatal("expected rejection of ftp: URL")
	}
}

func TestURL_RejectsLong(t *testing.T) {
	long := "https://example.com/" + string(make([]byte, 2100))
	_, ok := URL(long, 2048)
	if ok {
		t.Fatal("expected rejection of overly long URL")
	}
}

func TestURL_EmptyIsValid(t *testing.T) {
	result, ok := URL("", 2048)
	if !ok || result != "" {
		t.Fatalf("expected empty to be valid, got %q (ok=%v)", result, ok)
	}
}

func TestURL_TrimsWhitespace(t *testing.T) {
	result, ok := URL("  https://example.com  ", 2048)
	if !ok || result != "https://example.com" {
		t.Fatalf("expected trimmed URL, got %q", result)
	}
}

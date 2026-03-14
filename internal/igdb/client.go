package igdb

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"
)

type Client struct {
	clientID     string
	clientSecret string
	mu           sync.Mutex
	token        string
	tokenExpiry  time.Time
	httpClient   *http.Client
}

type GameResult struct {
	IGDBID      int      `json:"igdb_id"`
	Title       string   `json:"title"`
	CoverURL    string   `json:"cover_url"`
	ReleaseYear int      `json:"release_year"`
	Platforms   []string `json:"platforms"`
}

func NewClient(clientID, clientSecret string) *Client {
	return &Client{
		clientID:     clientID,
		clientSecret: clientSecret,
		httpClient:   &http.Client{Timeout: 10 * time.Second},
	}
}

func (c *Client) getToken(ctx context.Context) (string, error) {
	c.mu.Lock()
	defer c.mu.Unlock()

	if c.token != "" && time.Now().Before(c.tokenExpiry) {
		return c.token, nil
	}

	form := url.Values{}
	form.Set("client_id", c.clientID)
	form.Set("client_secret", c.clientSecret)
	form.Set("grant_type", "client_credentials")

	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		"https://id.twitch.tv/oauth2/token", strings.NewReader(form.Encode()))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("token request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("token request failed %d: %s", resp.StatusCode, body)
	}

	var result struct {
		AccessToken string `json:"access_token"`
		ExpiresIn   int    `json:"expires_in"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", fmt.Errorf("token decode: %w", err)
	}

	c.token = result.AccessToken
	// Subtract 60s buffer so we refresh before actual expiry
	c.tokenExpiry = time.Now().Add(time.Duration(result.ExpiresIn-60) * time.Second)
	return c.token, nil
}

func (c *Client) SearchGames(ctx context.Context, q string, limit int) ([]GameResult, error) {
	token, err := c.getToken(ctx)
	if err != nil {
		return nil, fmt.Errorf("igdb auth: %w", err)
	}

	query := fmt.Sprintf(
		`fields name, cover.image_id, first_release_date, platforms.name; search "%s"; limit %d; where cover != null & rating_count > 5;`,
		strings.ReplaceAll(q, `"`, `\"`), limit,
	)

	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		"https://api.igdb.com/v4/games", bytes.NewBufferString(query))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Client-ID", c.clientID)
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "text/plain")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("igdb request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("igdb response %d: %s", resp.StatusCode, body)
	}

	var raw []struct {
		ID               int    `json:"id"`
		Name             string `json:"name"`
		FirstReleaseDate int64  `json:"first_release_date"`
		Cover            *struct {
			ImageID string `json:"image_id"`
		} `json:"cover"`
		Platforms []struct {
			Name string `json:"name"`
		} `json:"platforms"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&raw); err != nil {
		return nil, fmt.Errorf("igdb decode: %w", err)
	}

	results := make([]GameResult, 0, len(raw))
	for _, g := range raw {
		result := GameResult{
			IGDBID: g.ID,
			Title:  g.Name,
		}
		if g.Cover != nil && g.Cover.ImageID != "" {
			result.CoverURL = "https://images.igdb.com/igdb/image/upload/t_cover_big/" + g.Cover.ImageID + ".jpg"
		}
		if g.FirstReleaseDate != 0 {
			result.ReleaseYear = time.Unix(g.FirstReleaseDate, 0).UTC().Year()
		}
		for _, p := range g.Platforms {
			result.Platforms = append(result.Platforms, p.Name)
		}
		results = append(results, result)
	}
	return results, nil
}

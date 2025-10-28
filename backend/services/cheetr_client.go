package services

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

type CheetrClient struct {
	apiKey  string
	baseURL string
	client  *http.Client
}

type Mover struct {
	Symbol        string  `json:"symbol"`
	ChangePercent float64 `json:"change_percent"`
	Volume        int64   `json:"volume"`
	Price         float64 `json:"price"`
	OpenPrice     float64 `json:"open_price"`
	HighPrice     float64 `json:"high_price"`
	LowPrice      float64 `json:"low_price"`
	ClosePrice    float64 `json:"close_price"`
	Rank          int     `json:"rank"`
	Category      string  `json:"category"`
	Date          string  `json:"date"`
}

type MoversResponse struct {
	Date    string  `json:"date"`
	Gainers []Mover `json:"gainers"`
	Losers  []Mover `json:"losers"`
	Total   int     `json:"total"`
}

type Quote struct {
	Symbol    string  `json:"symbol"`
	Price     float64 `json:"price"`
	Open      float64 `json:"open"`
	High      float64 `json:"high"`
	Low       float64 `json:"low"`
	Volume    int64   `json:"volume"`
	Timestamp string  `json:"timestamp"`
}

type PriceBar struct {
	Timestamp string  `json:"timestamp"`
	Open      float64 `json:"open"`
	High      float64 `json:"high"`
	Low       float64 `json:"low"`
	Close     float64 `json:"close"`
	Volume    int64   `json:"volume"`
	VWAP      float64 `json:"vwap,omitempty"`
}

type HistoryResponse struct {
	Symbol string     `json:"symbol"`
	Bars   []PriceBar `json:"bars"`
	Count  int        `json:"count"`
}

type MarketStatus struct {
	IsOpen      bool   `json:"isOpen"`
	CurrentTime string `json:"currentTime"`
	Message     string `json:"message"`
}

func NewCheetrClient(apiKey, baseURL string) *CheetrClient {
	if baseURL == "" {
		baseURL = "http://localhost:3001"
	}

	return &CheetrClient{
		apiKey:  apiKey,
		baseURL: baseURL,
		client: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

func (c *CheetrClient) doRequest(endpoint string) ([]byte, error) {
	req, err := http.NewRequest("GET", c.baseURL+endpoint, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("X-API-Key", c.apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("API error (status %d): %s", resp.StatusCode, string(body))
	}

	return body, nil
}

// GetMovers fetches the top 100 daily movers (gainers and losers)
func (c *CheetrClient) GetMovers() (*MoversResponse, error) {
	body, err := c.doRequest("/api/movers")
	if err != nil {
		return nil, err
	}

	var movers MoversResponse
	if err := json.Unmarshal(body, &movers); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	return &movers, nil
}

// GetQuote fetches the latest quote for a symbol
func (c *CheetrClient) GetQuote(symbol string) (*Quote, error) {
	body, err := c.doRequest(fmt.Sprintf("/api/quote/%s", symbol))
	if err != nil {
		return nil, err
	}

	var quote Quote
	if err := json.Unmarshal(body, &quote); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	return &quote, nil
}

// GetHistory fetches historical price data for a symbol
func (c *CheetrClient) GetHistory(symbol string, days int) (*HistoryResponse, error) {
	endpoint := fmt.Sprintf("/api/history/%s?days=%d", symbol, days)
	body, err := c.doRequest(endpoint)
	if err != nil {
		return nil, err
	}

	var history HistoryResponse
	if err := json.Unmarshal(body, &history); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	return &history, nil
}

// GetMarketStatus checks if the market is currently open
func (c *CheetrClient) GetMarketStatus() (*MarketStatus, error) {
	body, err := c.doRequest("/api/market-status")
	if err != nil {
		return nil, err
	}

	var status MarketStatus
	if err := json.Unmarshal(body, &status); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	return &status, nil
}

// GetAllMovers returns a combined list of all movers (gainers + losers)
func (c *CheetrClient) GetAllMovers() ([]Mover, error) {
	movers, err := c.GetMovers()
	if err != nil {
		return nil, err
	}

	all := append(movers.Gainers, movers.Losers...)
	return all, nil
}

// GetTopGainers returns only the top gainers
func (c *CheetrClient) GetTopGainers(limit int) ([]Mover, error) {
	movers, err := c.GetMovers()
	if err != nil {
		return nil, err
	}

	if limit > 0 && limit < len(movers.Gainers) {
		return movers.Gainers[:limit], nil
	}

	return movers.Gainers, nil
}

// GetTopLosers returns only the top losers
func (c *CheetrClient) GetTopLosers(limit int) ([]Mover, error) {
	movers, err := c.GetMovers()
	if err != nil {
		return nil, err
	}

	if limit > 0 && limit < len(movers.Losers) {
		return movers.Losers[:limit], nil
	}

	return movers.Losers, nil
}






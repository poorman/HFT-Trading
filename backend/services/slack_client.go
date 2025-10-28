package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"
)

type SlackMessage struct {
	Text        string                 `json:"text,omitempty"`
	Channel     string                 `json:"channel,omitempty"`
	Username    string                 `json:"username,omitempty"`
	IconEmoji   string                 `json:"icon_emoji,omitempty"`
	Attachments []SlackAttachment      `json:"attachments,omitempty"`
	Blocks      []SlackBlock           `json:"blocks,omitempty"`
}

type SlackAttachment struct {
	Color     string                 `json:"color,omitempty"`
	Title     string                 `json:"title,omitempty"`
	Text      string                 `json:"text,omitempty"`
	Fields    []SlackField           `json:"fields,omitempty"`
	Timestamp int64                  `json:"ts,omitempty"`
	Footer    string                 `json:"footer,omitempty"`
}

type SlackField struct {
	Title string `json:"title"`
	Value string `json:"value"`
	Short bool   `json:"short"`
}

type SlackBlock struct {
	Type string                 `json:"type"`
	Text *SlackTextElement      `json:"text,omitempty"`
}

type SlackTextElement struct {
	Type string `json:"type"`
	Text string `json:"text"`
}

type SlackClient struct {
	webhookURL string
	channel    string
	username   string
}

func NewSlackClient() *SlackClient {
	return &SlackClient{
		webhookURL: os.Getenv("SLACK_WEBHOOK_URL"),
		channel:    os.Getenv("SLACK_CHANNEL"),
		username:   "HFT Trading Bot",
	}
}

func (sc *SlackClient) SendMessage(message SlackMessage) error {
	if sc.webhookURL == "" {
		log.Printf("⚠️ Slack webhook URL not configured, skipping message")
		return nil
	}

	// Set default channel if not specified
	if message.Channel == "" {
		message.Channel = sc.channel
	}

	// Set default username if not specified
	if message.Username == "" {
		message.Username = sc.username
	}

	jsonData, err := json.Marshal(message)
	if err != nil {
		return fmt.Errorf("failed to marshal Slack message: %w", err)
	}

	resp, err := http.Post(sc.webhookURL, "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return fmt.Errorf("failed to send Slack message: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("Slack webhook returned status %d", resp.StatusCode)
	}

	log.Printf("✅ Sent Slack message to channel %s", message.Channel)
	return nil
}

// SendTradingAlert sends a trading alert to Slack
func (sc *SlackClient) SendTradingAlert(symbol, action, price string, quantity float64) error {
	color := "good"
	if action == "SELL" {
		color = "danger"
	}

	message := SlackMessage{
		Text: fmt.Sprintf("🚨 Trading Alert: %s %s", action, symbol),
		Attachments: []SlackAttachment{
			{
				Color: color,
				Title: fmt.Sprintf("%s Order Executed", action),
				Fields: []SlackField{
					{Title: "Symbol", Value: symbol, Short: true},
					{Title: "Action", Value: action, Short: true},
					{Title: "Price", Value: fmt.Sprintf("$%s", price), Short: true},
					{Title: "Quantity", Value: fmt.Sprintf("%.2f", quantity), Short: true},
					{Title: "Timestamp", Value: time.Now().Format("2006-01-02 15:04:05 UTC"), Short: false},
				},
				Footer: "HFT Trading System",
				Timestamp: time.Now().Unix(),
			},
		},
	}

	return sc.SendMessage(message)
}

// SendRiskAlert sends a risk management alert to Slack
func (sc *SlackClient) SendRiskAlert(alertType, message string, severity string) error {
	color := "warning"
	if severity == "high" {
		color = "danger"
	} else if severity == "low" {
		color = "good"
	}

	slackMessage := SlackMessage{
		Text: fmt.Sprintf("⚠️ Risk Alert: %s", alertType),
		Attachments: []SlackAttachment{
			{
				Color: color,
				Title: fmt.Sprintf("Risk Management Alert: %s", alertType),
				Text:  message,
				Fields: []SlackField{
					{Title: "Severity", Value: severity, Short: true},
					{Title: "Timestamp", Value: time.Now().Format("2006-01-02 15:04:05 UTC"), Short: true},
				},
				Footer: "HFT Risk Management",
				Timestamp: time.Now().Unix(),
			},
		},
	}

	return sc.SendMessage(slackMessage)
}

// SendSystemStatus sends system status updates to Slack
func (sc *SlackClient) SendSystemStatus(status string, details map[string]interface{}) error {
	color := "good"
	if status == "ERROR" {
		color = "danger"
	} else if status == "WARNING" {
		color = "warning"
	}

	fields := []SlackField{
		{Title: "Status", Value: status, Short: true},
		{Title: "Timestamp", Value: time.Now().Format("2006-01-02 15:04:05 UTC"), Short: true},
	}

	for key, value := range details {
		fields = append(fields, SlackField{
			Title: key,
			Value: fmt.Sprintf("%v", value),
			Short: true,
		})
	}

	message := SlackMessage{
		Text: fmt.Sprintf("📊 System Status: %s", status),
		Attachments: []SlackAttachment{
			{
				Color:   color,
				Title:   "HFT Trading System Status",
				Fields:  fields,
				Footer:  "HFT Monitoring",
				Timestamp: time.Now().Unix(),
			},
		},
	}

	return sc.SendMessage(message)
}

// SendDailySummary sends a daily trading summary to Slack
func (sc *SlackClient) SendDailySummary(summary map[string]interface{}) error {
	fields := []SlackField{
		{Title: "Date", Value: time.Now().Format("2006-01-02"), Short: true},
		{Title: "Status", Value: "Daily Summary", Short: true},
	}

	for key, value := range summary {
		fields = append(fields, SlackField{
			Title: key,
			Value: fmt.Sprintf("%v", value),
			Short: true,
		})
	}

	message := SlackMessage{
		Text: "📈 Daily Trading Summary",
		Attachments: []SlackAttachment{
			{
				Color:   "good",
				Title:   "HFT Trading Daily Summary",
				Fields:  fields,
				Footer:  "HFT Trading System",
				Timestamp: time.Now().Unix(),
			},
		},
	}

	return sc.SendMessage(message)
}

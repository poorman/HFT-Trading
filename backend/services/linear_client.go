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

type LinearIssue struct {
	Title       string                 `json:"title"`
	Description string                 `json:"description"`
	TeamID      string                 `json:"teamId"`
	ProjectID   string                 `json:"projectId,omitempty"`
	Labels      []string               `json:"labels,omitempty"`
	Priority    int                    `json:"priority"`
	Metadata    map[string]interface{} `json:"metadata,omitempty"`
}

type LinearClient struct {
	apiKey   string
	baseURL  string
	teamID   string
	projectID string
}

func NewLinearClient() *LinearClient {
	return &LinearClient{
		apiKey:    os.Getenv("LINEAR_API_KEY"),
		baseURL:   "https://api.linear.app/graphql",
		teamID:    os.Getenv("LINEAR_TEAM_ID"),
		projectID: os.Getenv("LINEAR_PROJECT_ID"),
	}
}

func (lc *LinearClient) CreateIssue(issue LinearIssue) error {
	if lc.apiKey == "" {
		log.Printf("⚠️ Linear API key not configured, skipping issue creation")
		return nil
	}

	// GraphQL mutation for creating an issue
	mutation := `
		mutation IssueCreate($input: IssueCreateInput!) {
			issueCreate(input: $input) {
				success
				issue {
					id
					identifier
					title
				}
			}
		}
	`

	input := map[string]interface{}{
		"title":       issue.Title,
		"description": issue.Description,
		"teamId":      lc.teamID,
		"priority":    issue.Priority,
	}

	if lc.projectID != "" {
		input["projectId"] = lc.projectID
	}

	if len(issue.Labels) > 0 {
		input["labelIds"] = issue.Labels
	}

	payload := map[string]interface{}{
		"query":     mutation,
		"variables": map[string]interface{}{"input": input},
	}

	jsonData, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal Linear request: %w", err)
	}

	req, err := http.NewRequest("POST", lc.baseURL, bytes.NewBuffer(jsonData))
	if err != nil {
		return fmt.Errorf("failed to create Linear request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+lc.apiKey)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("failed to send Linear request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("Linear API returned status %d", resp.StatusCode)
	}

	log.Printf("✅ Created Linear issue: %s", issue.Title)
	return nil
}

// CreateBugIssue creates a bug issue in Linear
func (lc *LinearClient) CreateBugIssue(component, description string) error {
	issue := LinearIssue{
		Title:       fmt.Sprintf("[BUG] %s: %s", component, description),
		Description: fmt.Sprintf("**Component:** %s\n\n**Description:** %s\n\n**Severity:** High\n\n**Environment:** Production", component, description),
		TeamID:      lc.teamID,
		ProjectID:   lc.projectID,
		Labels:      []string{"bug", "priority-high"},
		Priority:   1, // High priority
		Metadata: map[string]interface{}{
			"component": component,
			"type":      "bug",
			"timestamp": time.Now().UTC(),
		},
	}

	return lc.CreateIssue(issue)
}

// CreateFeatureIssue creates a feature request issue in Linear
func (lc *LinearClient) CreateFeatureIssue(component, description string) error {
	issue := LinearIssue{
		Title:       fmt.Sprintf("[FEATURE] %s: %s", component, description),
		Description: fmt.Sprintf("**Component:** %s\n\n**Description:** %s\n\n**Type:** Feature Request\n\n**Priority:** Medium", component, description),
		TeamID:      lc.teamID,
		ProjectID:   lc.projectID,
		Labels:      []string{"enhancement", "priority-medium"},
		Priority:    2, // Medium priority
		Metadata: map[string]interface{}{
			"component": component,
			"type":      "feature",
			"timestamp": time.Now().UTC(),
		},
	}

	return lc.CreateIssue(issue)
}

// CreatePerformanceIssue creates a performance issue in Linear
func (lc *LinearClient) CreatePerformanceIssue(component, description string) error {
	issue := LinearIssue{
		Title:       fmt.Sprintf("[PERFORMANCE] %s: %s", component, description),
		Description: fmt.Sprintf("**Component:** %s\n\n**Description:** %s\n\n**Type:** Performance Issue\n\n**Priority:** High", component, description),
		TeamID:      lc.teamID,
		ProjectID:   lc.projectID,
		Labels:      []string{"performance", "priority-high"},
		Priority:    1, // High priority
		Metadata: map[string]interface{}{
			"component": component,
			"type":      "performance",
			"timestamp": time.Now().UTC(),
		},
	}

	return lc.CreateIssue(issue)
}

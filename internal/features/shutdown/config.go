package shutdown

import (
	"fmt"
	"strings"

	"mewagents/internal/mqtt"
)

// Config holds shutdown feature configuration.
type Config struct {
	URL      string `json:"url"`
	Username string `json:"username"`
	Password string `json:"password"`
}

func (c *Config) FeatureName() string { return featureName }

// Validate checks shutdown configuration.
func (c *Config) Validate() error {
	if strings.TrimSpace(c.URL) == "" {
		return fmt.Errorf("url is required")
	}
	if _, _, err := mqtt.ParseBrokerURL(c.URL); err != nil {
		return err
	}
	if strings.TrimSpace(c.Username) == "" {
		return fmt.Errorf("username is required")
	}
	if strings.TrimSpace(c.Password) == "" {
		return fmt.Errorf("password is required")
	}
	return nil
}

// RedactedURL returns a safe broker URL for logging.
func (c *Config) RedactedURL() string {
	return mqtt.RedactedURL(c.URL)
}

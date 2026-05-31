package shutdown_test

import (
	"testing"

	. "mewagents/internal/features/shutdown"
)

func TestConfigValidate(t *testing.T) {
	valid := &Config{
		URL:      "mqtt://broker.example.com:1883",
		Username: "admin",
		Password: "secret",
	}
	if err := valid.Validate(); err != nil {
		t.Fatalf("expected valid config, got %v", err)
	}

	invalid := &Config{
		URL:      "ws://broker.example.com:8080",
		Username: "admin",
		Password: "secret",
	}
	if err := invalid.Validate(); err == nil {
		t.Fatal("expected invalid scheme error")
	}
}

func TestConfigRedactedURL(t *testing.T) {
	cfg := &Config{
		URL:      "mqtt://user:secret@broker.example.com:1883",
		Username: "admin",
		Password: "secret",
	}
	if cfg.RedactedURL() != "mqtt://broker.example.com:1883" {
		t.Fatalf("unexpected redacted url: %q", cfg.RedactedURL())
	}
}

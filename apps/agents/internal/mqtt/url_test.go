package mqtt_test

import (
	"testing"

	"github.com/mewisme/MewAgents/apps/agents/internal/mqtt"
)

func TestParseBrokerURL(t *testing.T) {
	tests := []struct {
		raw    string
		scheme string
		ok     bool
	}{
		{"mqtt://broker.example.com:1883", "mqtt", true},
		{"mqtts://broker.example.com:8883", "mqtts", true},
		{"ws://broker.example.com:8080", "", false},
		{"http://broker.example.com", "", false},
		{"", "", false},
	}

	for _, tc := range tests {
		u, _, err := mqtt.ParseBrokerURL(tc.raw)
		if tc.ok {
			if err != nil {
				t.Fatalf("ParseBrokerURL(%q) unexpected error: %v", tc.raw, err)
			}
			if u.Scheme != tc.scheme {
				t.Fatalf("ParseBrokerURL(%q) scheme = %q, want %q", tc.raw, u.Scheme, tc.scheme)
			}
			continue
		}
		if err == nil {
			t.Fatalf("ParseBrokerURL(%q) expected error", tc.raw)
		}
	}
}

func TestRedactedURLRemovesCredentials(t *testing.T) {
	redacted := mqtt.RedactedURL("mqtt://user:secret@broker.example.com:1883")
	if redacted != "mqtt://broker.example.com:1883" {
		t.Fatalf("unexpected redacted url: %q", redacted)
	}
}

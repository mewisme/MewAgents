package shutdown_test

import (
	"io"
	"log/slog"
	"testing"
	"time"

	. "github.com/mewisme/MewAgents/apps/agents/internal/features/shutdown"
)

func TestParsePingTopic(t *testing.T) {
	tests := []struct {
		topic string
		mac   string
		isOK  bool
		ok    bool
	}{
		{"ping/AABBCCDDEEFF", "AABBCCDDEEFF", false, true},
		{"ping/AA:BB:CC:DD:EE:FF", "AABBCCDDEEFF", false, true},
		{"ping/AA-BB-CC-DD-EE-FF/ok", "AABBCCDDEEFF", true, true},
		{"ping/AABBCCDDEEFF/ok", "AABBCCDDEEFF", true, true},
		{"ping/", "", false, false},
		{"ping//ok", "", false, false},
		{"ping/not-a-mac", "", false, false},
		{"ping/too/deep", "", false, false},
		{"shutdown/AABBCCDDEEFF", "", false, false},
	}

	for _, tc := range tests {
		mac, isOK, ok := ParsePingTopicForTest(tc.topic)
		if mac != tc.mac || isOK != tc.isOK || ok != tc.ok {
			t.Fatalf("ParsePingTopicForTest(%q) = (%q, %v, %v), want (%q, %v, %v)",
				tc.topic, mac, isOK, ok, tc.mac, tc.isOK, tc.ok)
		}
	}
}

func TestMessageHandlerPing(t *testing.T) {
	store := NewPendingStoreForTest(time.Minute, time.Now)
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))

	var publishedMAC string
	handler := NewMessageHandlerWithPingForTest(logger, store, []string{"AABBCCDDEEFF"}, nil, func(normalizedMAC string) error {
		publishedMAC = normalizedMAC
		return nil
	})

	handler.HandleTopic("ping/AABBCCDDEEFF")
	if publishedMAC != "AABBCCDDEEFF" {
		t.Fatalf("published mac = %q, want AABBCCDDEEFF", publishedMAC)
	}

	publishedMAC = ""
	handler.HandleTopic("ping/AA:BB:CC:DD:EE:FF")
	if publishedMAC != "AABBCCDDEEFF" {
		t.Fatalf("published mac = %q, want AABBCCDDEEFF", publishedMAC)
	}
}

func TestMessageHandlerPingUnknownMAC(t *testing.T) {
	store := NewPendingStoreForTest(time.Minute, time.Now)
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))

	published := false
	handler := NewMessageHandlerWithPingForTest(logger, store, []string{"AABBCCDDEEFF"}, nil, func(normalizedMAC string) error {
		published = true
		return nil
	})

	handler.HandleTopic("ping/001122334455")
	if published {
		t.Fatal("expected unknown mac ping to be ignored")
	}
}

func TestMessageHandlerPingOKIgnored(t *testing.T) {
	store := NewPendingStoreForTest(time.Minute, time.Now)
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))

	published := false
	handler := NewMessageHandlerWithPingForTest(logger, store, []string{"AABBCCDDEEFF"}, nil, func(normalizedMAC string) error {
		published = true
		return nil
	})

	handler.HandleTopic("ping/AABBCCDDEEFF/ok")
	if published {
		t.Fatal("expected ping ok messages to be ignored")
	}
}

func TestPingOKTopicAndPayload(t *testing.T) {
	if got := PingOKTopicForTest("AABBCCDDEEFF"); got != "ping/AABBCCDDEEFF/ok" {
		t.Fatalf("topic = %q, want ping/AABBCCDDEEFF/ok", got)
	}
	if got := string(PingResultPayloadForTest("AABBCCDDEEFF")); got != "AA:BB:CC:DD:EE:FF" {
		t.Fatalf("payload = %q, want AA:BB:CC:DD:EE:FF", got)
	}
}

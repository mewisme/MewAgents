package shutdown_test

import (
	"testing"

	. "mewagents/internal/features/shutdown"
)

func TestSubscriptionTopics(t *testing.T) {
	topics := SubscriptionTopics()
	if len(topics) != 2 {
		t.Fatalf("expected 2 subscription topics, got %d", len(topics))
	}
	if topics[0] != "shutdown/+" || topics[1] != "shutdown/+/confirm" {
		t.Fatalf("unexpected topics: %#v", topics)
	}
}

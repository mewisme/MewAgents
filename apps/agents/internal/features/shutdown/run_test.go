package shutdown_test

import (
	"testing"

	. "github.com/mewisme/MewAgents/apps/agents/internal/features/shutdown"
)

func TestSubscriptionTopics(t *testing.T) {
	topics := SubscriptionTopics()
	if len(topics) != 5 {
		t.Fatalf("expected 5 subscription topics, got %d", len(topics))
	}
	want := []string{
		"shutdown/+",
		"shutdown/+/confirm",
		"shutdown/+/cancel",
		"ping/+",
		"ping/+/ok",
	}
	for i, topic := range want {
		if topics[i] != topic {
			t.Fatalf("topic[%d] = %q, want %q; all: %#v", i, topics[i], topic, topics)
		}
	}
}

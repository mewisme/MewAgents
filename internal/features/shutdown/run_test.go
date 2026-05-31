package shutdown_test

import (
	"testing"

	. "mewagents/internal/features/shutdown"
)

func TestSubscriptionTopics(t *testing.T) {
	topics := SubscriptionTopics()
	if len(topics) != 3 {
		t.Fatalf("expected 3 subscription topics, got %d", len(topics))
	}
	want := []string{"shutdown/+", "shutdown/+/confirm", "shutdown/+/cancel"}
	for i, topic := range want {
		if topics[i] != topic {
			t.Fatalf("topic[%d] = %q, want %q; all: %#v", i, topics[i], topic, topics)
		}
	}
}

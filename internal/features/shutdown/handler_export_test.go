package shutdown

import "log/slog"

// MessageHandlerTest wraps MQTT topic handling for tests.
type MessageHandlerTest struct {
	handler *messageHandler
}

// NewMessageHandlerForTest creates a message handler for unit tests.
func NewMessageHandlerForTest(logger *slog.Logger, store *PendingStoreTest, macs []string, shutdownFn func() error) *MessageHandlerTest {
	return &MessageHandlerTest{
		handler: newMessageHandler(logger, store.store, macs, shutdownFn),
	}
}

// HandleTopic processes an MQTT topic as if a message was received.
func (h *MessageHandlerTest) HandleTopic(topic string) {
	h.handler.handleTopic(topic)
}

package shutdown

// SubscriptionTopics returns MQTT wildcard topics for shutdown and ping messages.
func SubscriptionTopics() []string {
	return subscriptionTopics()
}

// ParsePingTopicForTest parses ping MQTT topics for unit tests.
func ParsePingTopicForTest(topic string) (normalizedMAC string, isOK bool, ok bool) {
	return parsePingTopic(topic)
}

// PingOKTopicForTest builds the ping ok topic for a normalized MAC.
func PingOKTopicForTest(normalizedMAC string) string {
	return pingOKTopic(normalizedMAC)
}

// PingResultPayloadForTest builds the ping result payload for a normalized MAC.
func PingResultPayloadForTest(normalizedMAC string) []byte {
	return pingResultPayload(normalizedMAC)
}

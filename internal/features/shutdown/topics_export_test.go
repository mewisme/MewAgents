package shutdown

// SubscriptionTopics returns MQTT wildcard topics for shutdown messages.
func SubscriptionTopics() []string {
	return subscriptionTopics()
}

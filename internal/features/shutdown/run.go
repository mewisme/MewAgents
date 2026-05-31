package shutdown

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/eclipse/paho.golang/autopaho"
	"github.com/eclipse/paho.golang/paho"

	"mewagents/internal/registry"
)

// Run executes the shutdown feature runtime.
func (f *Feature) Run(ctx context.Context, rt registry.Runtime, cfg registry.Config) error {
	c, ok := cfg.(*Config)
	if !ok {
		return fmt.Errorf("invalid config type for shutdown feature")
	}
	if err := c.Validate(); err != nil {
		return err
	}

	logger := rt.Logger().With("feature", featureName)

	macs, err := rt.Network().ActiveMACs(ctx)
	if err != nil {
		return err
	}
	logger.Info("detected active mac addresses", "macs", macs)

	store := newPendingStore(defaultPendingTTL)
	handler := newMessageHandler(logger, store, macs, func() error {
		return rt.Platform().Shutdown(ctx)
	})

	sweepCtx, sweepCancel := context.WithCancel(ctx)
	defer sweepCancel()
	go runSweeper(sweepCtx, logger, store)

	topics := buildTopics(macs)
	conn, err := rt.MQTT().Connect(ctx, registry.MQTTOptions{
		Feature:  featureName,
		Broker:   c.URL,
		Username: c.Username,
		Password: c.Password,
		Logger:   logger,
		OnUp: func(cm *autopaho.ConnectionManager, connAck *paho.Connack) {
			subscriptions := make([]paho.SubscribeOptions, 0, len(topics))
			for _, topic := range topics {
				subscriptions = append(subscriptions, paho.SubscribeOptions{
					Topic: topic,
					QoS:   1,
				})
			}
			if _, err := cm.Subscribe(ctx, &paho.Subscribe{Subscriptions: subscriptions}); err != nil {
				logger.Error("mqtt subscribe failed", "error", err)
				return
			}
			logger.Info("mqtt subscribed", "topics", topics)
		},
	})
	if err != nil {
		return err
	}
	defer func() {
		disconnectCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		_ = conn.Disconnect(disconnectCtx)
	}()

	conn.AddOnPublishReceived(func(pr autopaho.PublishReceived) (bool, error) {
		if pr.Packet == nil {
			return true, nil
		}
		handler.handleTopic(pr.Packet.Topic)
		return true, nil
	})

	logger.Info("shutdown feature running", "broker", c.RedactedURL())
	<-ctx.Done()
	logger.Info("shutdown feature stopping")
	return ctx.Err()
}

func buildTopics(macs []string) []string {
	topics := make([]string, 0, len(macs)*2)
	for _, mac := range macs {
		topics = append(topics, topicForRequest(mac), topicForConfirm(mac))
	}
	return topics
}

func runSweeper(ctx context.Context, logger *slog.Logger, store *pendingStore) {
	ticker := time.NewTicker(10 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			if removed := store.sweep(); removed > 0 {
				logger.Info("expired pending shutdown requests removed", "count", removed)
			}
		}
	}
}

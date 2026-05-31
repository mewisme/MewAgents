package mqtt

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"log/slog"
	"net/url"
	"os"

	"github.com/eclipse/paho.golang/autopaho"
	"github.com/eclipse/paho.golang/paho"

	"mewagents/internal/registry"
)

// DefaultFactory creates autopaho connection managers.
type DefaultFactory struct{}

// NewFactory creates a default MQTT factory.
func NewFactory() *DefaultFactory {
	return &DefaultFactory{}
}

// Connect establishes an MQTT v5 connection with automatic reconnect.
func (f *DefaultFactory) Connect(ctx context.Context, opts registry.MQTTOptions) (*autopaho.ConnectionManager, error) {
	if opts.Logger == nil {
		opts.Logger = slog.Default()
	}

	brokerURL, tlsCfg, err := ParseBrokerURL(opts.Broker)
	if err != nil {
		return nil, err
	}

	clientID, err := stableClientID(opts.Feature)
	if err != nil {
		return nil, err
	}

	cfg := autopaho.ClientConfig{
		ServerUrls:                    []*url.URL{brokerURL},
		TlsCfg:                        tlsCfg,
		KeepAlive:                     20,
		CleanStartOnInitialConnection: false,
		SessionExpiryInterval:         3600,
		OnConnectionUp:                opts.OnUp,
		OnConnectError: func(err error) {
			opts.Logger.Warn("mqtt connection error", "broker", RedactedURL(opts.Broker), "error", err)
		},
		ClientConfig: paho.ClientConfig{
			ClientID: clientID,
			OnClientError: func(err error) {
				opts.Logger.Warn("mqtt client error", "error", err)
			},
			OnServerDisconnect: func(d *paho.Disconnect) {
				if d != nil {
					opts.Logger.Info("mqtt disconnected", "reason", d.ReasonCode)
				}
			},
		},
	}

	if opts.Username != "" {
		cfg.SetUsernamePassword(opts.Username, []byte(opts.Password))
	}

	cm, err := autopaho.NewConnection(ctx, cfg)
	if err != nil {
		return nil, fmt.Errorf("create mqtt connection: %w", err)
	}

	if err := cm.AwaitConnection(ctx); err != nil {
		return nil, fmt.Errorf("await mqtt connection: %w", err)
	}

	opts.Logger.Info("mqtt connected", "broker", RedactedURL(opts.Broker), "client_id", clientID)
	return cm, nil
}

func stableClientID(feature string) (string, error) {
	hostname, err := os.Hostname()
	if err != nil || hostname == "" {
		var b [8]byte
		if _, err := rand.Read(b[:]); err != nil {
			return "", fmt.Errorf("generate client id: %w", err)
		}
		hostname = hex.EncodeToString(b[:])
	}
	return fmt.Sprintf("mewagents-%s-%s", feature, hostname), nil
}

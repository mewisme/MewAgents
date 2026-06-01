package registry

import (
	"context"
	"log/slog"

	"github.com/eclipse/paho.golang/autopaho"
	"github.com/eclipse/paho.golang/paho"
)

// ConfigManager loads and saves per-feature configuration.
type ConfigManager interface {
	Dir(feature string) (string, error)
	Path(feature string) (string, error)
	Exists(feature string) (bool, error)
	Load(feature string, cfg any) error
	Save(feature string, cfg any) error
}

// ServiceManager controls OS service lifecycle for features.
type ServiceManager interface {
	Install(ctx context.Context, feature Feature, executable string) error
	Uninstall(ctx context.Context, feature Feature) error
	Start(ctx context.Context, feature Feature) error
	Stop(ctx context.Context, feature Feature) error
	Run(ctx context.Context, feature Feature, rt Runtime, run func(context.Context, Runtime, Config) error) error
}

// MQTTOptions configures an MQTT connection.
type MQTTOptions struct {
	Feature  string
	Broker   string
	Username string
	Password string
	Logger   *slog.Logger
	OnUp     func(cm *autopaho.ConnectionManager, connAck *paho.Connack)
}

// MQTTFactory creates MQTT connections.
type MQTTFactory interface {
	Connect(ctx context.Context, opts MQTTOptions) (*autopaho.ConnectionManager, error)
}

// Platform provides platform-specific operations.
type Platform interface {
	ConfigRoot() (string, error)
	FeatureConfigPath(feature string) (string, error)
	RestrictFilePerm(path string) error
	Shutdown(ctx context.Context) error
}

// NetworkCollector detects active network interface MAC addresses.
type NetworkCollector interface {
	ActiveMACs(ctx context.Context) ([]string, error)
}

// LifecycleManager coordinates graceful shutdown and background work.
type LifecycleManager interface {
	Run(ctx context.Context, fn func(context.Context) error)
	Wait() error
	NotifyContext(parent context.Context) (context.Context, context.CancelFunc)
}

// Runtime provides shared dependencies to features via dependency injection.
type Runtime interface {
	Logger() *slog.Logger
	Config() ConfigManager
	Service() ServiceManager
	MQTT() MQTTFactory
	Platform() Platform
	Network() NetworkCollector
	Lifecycle() LifecycleManager
	Context() context.Context
}

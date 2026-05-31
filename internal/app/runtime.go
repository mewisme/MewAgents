package app

import (
	"context"
	"log/slog"

	"github.com/mewisme/MewAgents/internal/config"
	"github.com/mewisme/MewAgents/internal/lifecycle"
	"github.com/mewisme/MewAgents/internal/logging"
	"github.com/mewisme/MewAgents/internal/mqtt"
	"github.com/mewisme/MewAgents/internal/network"
	"github.com/mewisme/MewAgents/internal/platform"
	"github.com/mewisme/MewAgents/internal/registry"
	servicemgr "github.com/mewisme/MewAgents/internal/service"
)

// Runtime is the dependency container for feature execution.
type Runtime struct {
	LoggerValue    *slog.Logger
	ConfigValue    *config.FileManager
	ServiceValue   *servicemgr.DefaultManager
	MQTTValue      *mqtt.DefaultFactory
	PlatformValue  platform.OS
	NetworkValue   *network.DefaultCollector
	LifecycleValue *lifecycle.Default
	Ctx            context.Context
	Cancel         context.CancelFunc
}

// NewRuntime constructs a runtime with default dependencies.
func NewRuntime(parent context.Context) (*Runtime, error) {
	ctx, cancel := context.WithCancel(parent)
	p := platform.Default()

	return &Runtime{
		LoggerValue:    logging.NewConsoleLogger(),
		ConfigValue:    config.NewManager(p),
		ServiceValue:   servicemgr.NewManager(),
		MQTTValue:      mqtt.NewFactory(),
		PlatformValue:  p,
		NetworkValue:   network.NewCollector(),
		LifecycleValue: lifecycle.New(),
		Ctx:            ctx,
		Cancel:         cancel,
	}, nil
}

func (r *Runtime) Logger() *slog.Logger                 { return r.LoggerValue }
func (r *Runtime) Config() registry.ConfigManager       { return r.ConfigValue }
func (r *Runtime) Service() registry.ServiceManager     { return r.ServiceValue }
func (r *Runtime) MQTT() registry.MQTTFactory           { return r.MQTTValue }
func (r *Runtime) Platform() registry.Platform          { return r.PlatformValue }
func (r *Runtime) Network() registry.NetworkCollector   { return r.NetworkValue }
func (r *Runtime) Lifecycle() registry.LifecycleManager { return r.LifecycleValue }
func (r *Runtime) Context() context.Context             { return r.Ctx }

// WithLogger returns a copy of the runtime using the provided logger.
func (r *Runtime) WithLogger(logger *slog.Logger) *Runtime {
	copy := *r
	copy.LoggerValue = logger
	return &copy
}

// WithContext returns a copy of the runtime using the provided context.
func (r *Runtime) WithContext(ctx context.Context, cancel context.CancelFunc) *Runtime {
	copy := *r
	copy.Ctx = ctx
	copy.Cancel = cancel
	return &copy
}

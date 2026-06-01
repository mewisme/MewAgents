# Mew Agents Feature Plugin — Reference

Filesystem paths below are monorepo-relative (`apps/agents/...`). Go **import paths** use the module path `github.com/mewisme/MewAgents/internal/...`.

## registry.Feature Interface

```go
type Feature interface {
    Name() string
    Description() string
    DefaultServiceName() string   // "mewagents-<name>"
    DefaultDisplayName() string   // "Mew Agents <Name>"

    NewConfig() Config
    ValidateConfig(cfg Config) error
    NewInstallFlags() any
    ConfigFromInstallFlags(flags any) (Config, error)

    Run(ctx context.Context, rt Runtime, cfg Config) error
}

type Config interface {
    FeatureName() string
}
```

## Complete feature.go Template

```go
package myfeature

import (
    "context"
    "fmt"

    "github.com/mewisme/MewAgents/internal/registry"
)

const featureName = "myfeature"

type Feature struct{}

func New() *Feature { return &Feature{} }

func (f *Feature) Name() string               { return featureName }
func (f *Feature) Description() string        { return "Description for service manager." }
func (f *Feature) DefaultServiceName() string { return "mewagents-" + featureName }
func (f *Feature) DefaultDisplayName() string { return "Mew Agents Myfeature" }

func (f *Feature) NewConfig() registry.Config { return &Config{} }

func (f *Feature) ValidateConfig(cfg registry.Config) error {
    c, ok := cfg.(*Config)
    if !ok {
        return fmt.Errorf("invalid config type for %s feature", featureName)
    }
    return c.Validate()
}

func (f *Feature) NewInstallFlags() any { return &InstallFlags{} }

func (f *Feature) ConfigFromInstallFlags(flags any) (registry.Config, error) {
    install, ok := flags.(*InstallFlags)
    if !ok {
        return nil, fmt.Errorf("invalid install flags type for %s feature", featureName)
    }
    return &Config{
        // map install fields → config fields
    }, nil
}

func (f *Feature) Run(ctx context.Context, rt registry.Runtime, cfg registry.Config) error {
    // see run.go template
    return nil
}
```

## config.go Template

```go
package myfeature

import "fmt"

type Config struct {
    Field string `json:"field"`
}

func (c *Config) FeatureName() string { return featureName }

func (c *Config) Validate() error {
    if c.Field == "" {
        return fmt.Errorf("field is required")
    }
    return nil
}
```

## install.go Template

```go
package myfeature

type InstallFlags struct {
    Field string `name:"field" short:"f" required:"" help:"Required field."`
}
```

## run.go Template (MQTT feature)

```go
package myfeature

import (
    "context"
    "fmt"
    "time"

    "github.com/eclipse/paho.golang/autopaho"
    "github.com/eclipse/paho.golang/paho"

    "github.com/mewisme/MewAgents/internal/mqtt"
    "github.com/mewisme/MewAgents/internal/registry"
)

func (f *Feature) Run(ctx context.Context, rt registry.Runtime, cfg registry.Config) error {
    c, ok := cfg.(*Config)
    if !ok {
        return fmt.Errorf("invalid config type for %s feature", featureName)
    }
    if err := c.Validate(); err != nil {
        return err
    }

    logger := rt.Logger().With("feature", featureName)

    conn, err := rt.MQTT().Connect(ctx, registry.MQTTOptions{
        Feature:  featureName,
        Broker:   c.BrokerURL,
        Username: c.Username,
        Password: c.Password,
        Logger:   logger,
        OnUp: func(cm *autopaho.ConnectionManager, _ *paho.Connack) {
            // subscribe here — re-runs on reconnect
        },
    })
    if err != nil {
        return err
    }
    defer func() {
        dctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
        defer cancel()
        _ = conn.Disconnect(dctx)
    }()

    logger.Info("feature running", "broker", mqtt.RedactedURL(c.BrokerURL))
    <-ctx.Done()
    logger.Info("feature stopping")
    return ctx.Err()
}
```

## registry.Runtime Methods

```go
type Runtime interface {
    Logger() *slog.Logger
    Config() ConfigManager
    Service() ServiceManager      // used by core, not features
    MQTT() MQTTFactory
    Platform() Platform
    Network() NetworkCollector
    Lifecycle() LifecycleManager
    Context() context.Context
}
```

## Install Lifecycle (core — do not reimplement)

1. Resolve feature from registry
2. Parse install flags (Kong second pass, passthrough on install command)
3. `ConfigFromInstallFlags` → `ValidateConfig`
4. Save `config.json` with restricted permissions
5. Register OS service: executable + args `run <feature>`

## CLI (automatic after registration)

```bash
mewagents install <feature> [flags]
mewagents uninstall <feature>
mewagents console <feature>
```

## Pre-PR Checklist

- [ ] All `registry.Feature` methods implemented
- [ ] Registered in `apps/agents/internal/features/register.go`
- [ ] Config validates all required fields
- [ ] Secrets never logged
- [ ] `Run` respects ctx, cleans up resources
- [ ] Same `Run` for console and service
- [ ] No core infrastructure changes (unless shared capability)
- [ ] Tests for config + core logic
- [ ] `gofmt`, `go vet`, `go test` pass

## Shutdown Feature File Map

Under `apps/agents/internal/features/shutdown/`:

| File | Learn from it |
|------|---------------|
| `feature.go` | Interface wiring, install flag mapping |
| `config.go` | Validation, redacted URL logging |
| `install.go` | Kong flag tags |
| `run.go` | MQTT lifecycle, sweeper goroutine, disconnect |
| `handler.go` | Topic parsing, message dispatch |
| `pending.go` | Mutex-protected in-memory state + TTL |

---
name: mewagents-feature-plugin
description: Implements a new Mew Agents feature plugin end-to-end in the mewagents Go codebase. Use when adding a feature, plugin, or module under internal/features/, registering a new capability (inventory, metrics, wake-on-lan, etc.), or when the user asks to create or scaffold a mewagents feature.
---

# Mew Agents Feature Plugin

Implement a complete, production-ready feature plugin. **Do not modify core infrastructure** unless the feature genuinely requires a new shared capability used by multiple features.

## Hard Rules

- Only two integration points: `internal/features/<name>/` + one line in `internal/features/register.go`
- **Never change** for a normal feature: `internal/app/commands.go`, `internal/service/`, `internal/config/`, `internal/mqtt/`, `internal/lifecycle/`
- Console and service modes share the **same** `Run()` — no duplicated runtime logic
- Consume dependencies via `registry.Runtime` interfaces only — no globals, no direct OS service calls from features
- Never log secrets; validate config before save; respect `ctx` cancellation

## Reference Implementation

Read before coding: `internal/features/shutdown/` (feature.go, config.go, install.go, run.go, handler.go, pending.go)

Full guide: [docs/implementing-a-plugin.md](../../docs/implementing-a-plugin.md)

## Workflow

Copy this checklist and track progress:

```
Feature Progress:
- [ ] Step 1: Scaffold package
- [ ] Step 2: Implement registry.Feature
- [ ] Step 3: Config + install flags
- [ ] Step 4: Run() with graceful shutdown
- [ ] Step 5: Register in register.go
- [ ] Step 6: Tests
- [ ] Step 7: Verify (gofmt, go vet, go test)
```

### Step 1: Scaffold package

Create `internal/features/<name>/`:

| File | Purpose |
|------|---------|
| `feature.go` | `registry.Feature` implementation |
| `config.go` | Config struct, `FeatureName()`, `Validate()` |
| `install.go` | Kong-tagged `InstallFlags` struct |
| `run.go` | Runtime loop (or merge into feature.go if small) |
| `*_test.go` | Config validation, handler logic, concurrency |

Naming conventions:
- Feature name: lowercase single word (`inventory`, `metrics`)
- Service name: `mewagents-<name>`
- Display name: `Mew Agents <Title Case>`

### Step 2: Implement registry.Feature

All methods required — see [reference.md](reference.md) for signatures and templates.

### Step 3: Config + install flags

```go
// config.go — must implement registry.Config
func (c *Config) FeatureName() string { return "<name>" }

// install.go — Kong tags for: mewagents install <name> [flags]
type InstallFlags struct {
    Field string `name:"field" short:"f" required:"" help:"..."`
}
```

Map flags in `ConfigFromInstallFlags`. Validate in both `ValidateConfig` and at start of `Run`.

Config paths (handled by core, do not hardcode):
- Windows: `%ProgramData%\MewAgents\<feature>\config.json`
- Linux: `/etc/mewagents/<feature>/config.json`
- macOS: `/Library/Application Support/MewAgents/<feature>/config.json`

### Step 4: Implement Run()

```go
func (f *Feature) Run(ctx context.Context, rt registry.Runtime, cfg registry.Config) error {
    c := cfg.(*Config) // type assert + validate
    logger := rt.Logger().With("feature", f.Name())

    // setup (MQTT, timers, etc.)

    logger.Info("feature running")
    <-ctx.Done()
    logger.Info("feature stopping")
    // cleanup: disconnect MQTT, stop goroutines
    return ctx.Err()
}
```

Runtime dependencies (via `registry.Runtime`):

| Method | Use |
|--------|-----|
| `Logger()` | slog logging |
| `MQTT()` | autopaho connect + reconnect |
| `Platform()` | OS paths, shutdown, file perms |
| `Network()` | active MAC detection |
| `Lifecycle()` | background goroutine tracking |
| `Context()` | root context |

MQTT pattern: subscribe in `OnUp` callback (re-runs on reconnect). Use `mqtt.ParseBrokerURL()` for validation.

### Step 5: Register

Add to `internal/features/register.go`:

```go
r.Register(<name>.New())
```

### Step 6: Tests

Minimum:
- Config validation (valid + invalid cases)
- Core business logic (handlers, state machines)
- Concurrent access if mutable in-memory state exists

Use `export_test.go` to expose internals when needed (see shutdown feature).

### Step 7: Verify

```bash
gofmt -w .
go vet ./...
go test ./internal/features/<name>/...
go build ./cmd/mewagents
```

## Anti-Patterns

- Modifying CLI handlers for feature-specific flags or logic
- Hardcoding feature names in core packages
- Shell execution with user input (`exec.Command("sh", "-c", ...)`)
- Separate runtime paths for console vs service
- Importing `internal/app` from feature packages (import cycles)

## When Core Changes Are Allowed

Add to `internal/platform/` or `internal/mqtt/` only when **multiple** future features need the same shared capability. Feature-specific logic stays in the feature package.

## Additional Resources

- Interface details and file templates: [reference.md](reference.md)
- Full documentation: [docs/implementing-a-plugin.md](../../docs/implementing-a-plugin.md)

# Mew Agents

**Mew Agents** (`mewagents`) is a cross-platform, single-binary agent platform for Windows, Linux, and macOS. It runs capabilities as independent OS services or in foreground console mode, with a plugin-ready architecture so new features can be added without changing core infrastructure.

## Features

| Feature | Description |
|---------|-------------|
| **shutdown** | Remote two-step machine shutdown over MQTT v5 |

Planned capabilities include inventory, metrics, wake-on-lan, remote terminal, clipboard sync, and update-agent.

## Requirements

- Go 1.26.3 or later
- Elevated privileges to install OS services (Administrator on Windows, root on Linux/macOS)

## Build

```bash
git clone https://github.com/mewisme/mewagents
cd mew-agent

go build -o mewagents .
```

Cross-compile:

```bash
GOOS=linux   GOARCH=amd64 go build -trimpath -ldflags="-s -w" -o mewagents-linux   .
GOOS=darwin  GOARCH=amd64 go build -trimpath -ldflags="-s -w" -o mewagents-darwin  .
GOOS=windows GOARCH=amd64 go build -trimpath -ldflags="-s -w" -o mewagents.exe     .
```

## Usage

```bash
# Install a feature as a system service
mewagents install shutdown \
  --url mqtt://broker.example.com:1883 \
  --username admin \
  --password secret

# Short flags
mewagents install shutdown -u mqtt://broker.example.com:1883 -n admin -p secret

# Run in foreground (Ctrl+C for graceful shutdown)
mewagents console shutdown

# Run with inline config flags (same flags as install; no config file required)
mewagents console shutdown \
  --url mqtt://broker.example.com:1883 \
  --username admin \
  --password secret

mewagents console shutdown -u mqtt://broker.example.com:1883 -n admin -p secret

# Remove the service (configuration is kept)
mewagents uninstall shutdown
```

### CLI commands

| Command | Description |
|---------|-------------|
| `install <feature> [flags]` | Validate config, save to disk, register OS service, enable start at boot, and start it |
| `uninstall <feature>` | Stop and remove the service; config file is retained |
| `console <feature> [flags]` | Run the feature in the foreground; optional flags override saved config |

Unknown features return a clear error listing all registered features.

## Configuration

Each feature stores its own configuration file:

| OS | Path |
|----|------|
| Windows | `%ProgramData%\MewAgents\<feature>\config.json` |
| Linux | `/etc/mewagents/<feature>/config.json` |
| macOS | `/Library/Application Support/MewAgents/<feature>/config.json` |

Configuration is written with restricted file permissions where the platform supports it. Secrets are never logged.

## Shutdown feature

The shutdown feature listens on MQTT topics derived from the machine's active network interface MAC addresses:

```
shutdown/{MAC}          → creates a pending shutdown request (1-minute TTL)
shutdown/{MAC}/confirm  → executes shutdown if a valid pending request exists
shutdown/{MAC}/cancel   → removes a pending request without shutting down
```

MAC addresses in topics may use any of these formats (case-insensitive):

- `AABBCCDDEEFF`
- `AA:BB:CC:DD:EE:FF`
- `AA-BB-CC-DD-EE-FF`

The agent subscribes to `shutdown/+`, `shutdown/+/confirm`, and `shutdown/+/cancel`, then handles only messages whose MAC segment matches a detected local interface. Other messages are ignored. Payload is ignored (topic-only protocol).

Supported shutdown commands (no shell execution):

| OS | Command |
|----|---------|
| Windows | `shutdown /s /t 0` |
| Linux | `shutdown -h now` |
| macOS | `osascript` → System Events shut down |

## Architecture

```
main.go                 Entry point, feature registration
internal/
  app/                  CLI, command dispatch, runtime container
  registry/             Feature interface and plugin registry
  config/               Per-feature JSON configuration
  service/              OS service install/run/uninstall
  mqtt/                 MQTT v5 client factory (autopaho)
  network/              Active MAC address detection
  platform/             OS paths, permissions, shutdown
  lifecycle/            Graceful shutdown coordination
  features/             Feature plugins
    shutdown/           Reference implementation
```

Core principles:

- **Plugin-ready** — features implement `registry.Feature` and register in `internal/features/register.go`
- **Dependency injection** — features consume shared services through `registry.Runtime`
- **Shared runtime** — console and service modes execute the same `Run()` method
- **Graceful shutdown** — context cancellation throughout; MQTT reconnect via autopaho

## Development

```bash
# Format, vet, test
gofmt -w .
go vet ./...
go test ./...

# Build
go build .
```

## Adding a new feature

1. Create `internal/features/<name>/` implementing `registry.Feature`
2. Register it in `internal/features/register.go`

No changes are needed to CLI handlers, service management, config, MQTT, or lifecycle code.

- [Implementing a Plugin](docs/implementing-a-plugin.md) — full developer guide
- [Shutdown reference](internal/features/shutdown/) — production-quality example
- Cursor skill: `.cursor/skills/mewagents-feature-plugin/` — agent workflow for scaffolding plugins

## Dependencies

| Library | Purpose |
|---------|---------|
| [eclipse/paho.golang](https://github.com/eclipse/paho.golang) | MQTT v5 with autopaho reconnect |
| [kardianos/service](https://github.com/kardianos/service) | Cross-platform OS service management |
| [alecthomas/kong](https://github.com/alecthomas/kong) | CLI parsing |
| `log/slog` | Structured logging (stdlib) |

## License

See repository license file.

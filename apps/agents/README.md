# Mew Agents

This app lives in the **mew-agents** monorepo at `apps/agents/`. From the repo root, use `make agents-check` / `make agents-build`, or `cd apps/agents` for Go commands directly.

**Mew Agents** (`mewagents`) is a cross-platform, single-binary agent platform for Windows, Linux, and macOS. It runs capabilities as independent OS services or in foreground console mode, with a plugin-ready architecture so new features can be added without changing core infrastructure.

## Features

| Feature | Description | Docs |
|---------|-------------|------|
| **shutdown** | Remote two-step machine shutdown over MQTT v5 | [shutdown](docs/features/shutdown.md) |

Planned capabilities include inventory, metrics, wake-on-lan, remote terminal, clipboard sync, and update-agent. Per-feature documentation lives under [`docs/features/`](docs/features/).

## Requirements

- Go 1.26.3 or later
- Elevated privileges to install OS services (Administrator on Windows, root on Linux/macOS)

## Install

### Releases

Download a binary from [GitHub Releases](https://github.com/mewisme/MewAgents/releases).

Or install with Go:

```bash
go install github.com/mewisme/MewAgents/apps/agents@latest
```

### Build from source

```bash
git clone https://github.com/mewisme/MewAgents.git
cd MewAgents

go build -ldflags="-s -w" -o mewagents .
```

On Windows with Go 1.26+, use `-ldflags="-s -w"` so the executable runs correctly.

## Cross-compile

Manual cross-compile:

```bash
GOOS=linux   GOARCH=amd64 go build -trimpath -ldflags="-s -w" -o mewagents-linux   .
GOOS=darwin  GOARCH=amd64 go build -trimpath -ldflags="-s -w" -o mewagents-darwin  .
GOOS=windows GOARCH=amd64 go build -trimpath -ldflags="-s -w" -o mewagents.exe     .
```

## Usage

```bash
mewagents install <feature> [flags]
mewagents start <feature>
mewagents stop <feature>
mewagents console <feature> [flags]
mewagents uninstall <feature>
```

See [Features](#features) for per-feature setup, flags, and protocol details.

### CLI commands

| Command | Description |
|---------|-------------|
| `install <feature> [flags]` | Validate config, save to disk, register OS service, enable start at boot, and start it |
| `uninstall <feature>` | Stop and remove the service; config file is retained |
| `start <feature>` | Start an installed feature service |
| `stop <feature>` | Stop a running feature service |
| `console <feature> [flags]` | Run the feature in the foreground; optional flags override saved config |
| `version` | Show version, install method, and whether a newer release is available |
| `update` | Update to the latest GitHub release |
| `update --check` | Only report if an update is available |
| `update --force` | Reinstall latest even if already up to date (go install: `-a`, `GOPROXY=direct`) |

Unknown features return a clear error listing all registered features.

### Self-update

`mewagents update` detects how you installed mewagents and picks the right path:

| Install method | Update action |
|----------------|---------------|
| **Homebrew** | `brew upgrade mewagents` |
| **go install** | `go install github.com/mewisme/MewAgents/apps/agents@<release-tag>` (latest GitHub tag) |
| **Binary** (release download) | Downloads from GitHub Releases and replaces the executable |

`mewagents version` prints build info, install method, and whether a newer release is available.

## Configuration

Each feature stores its own configuration file:

| OS | Path |
|----|------|
| Windows | `%ProgramData%\MewAgents\<feature>\config.json` |
| Linux | `/etc/mewagents/<feature>/config.json` |
| macOS | `/Library/Application Support/MewAgents/<feature>/config.json` |

Configuration is written with restricted file permissions where the platform supports it. Secrets are never logged.

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
docs/
  features/             Per-feature user documentation
  implementing-a-plugin.md
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

## Releases (maintainers)

Tag a version to trigger GoReleaser:

```bash
git tag v0.1.0
git push origin v0.1.0
```

The Release workflow will:

- Build Linux, macOS, and Windows binaries (amd64, arm64, and 386 for Linux/Windows)
- Publish GitHub release archives and checksums

CI runs tests on push/PR to `main`.

## Adding a new feature

1. Create `internal/features/<name>/` implementing `registry.Feature`
2. Register it in `internal/features/register.go`
3. Add user documentation under `docs/features/<name>.md` and link it from this README

No changes are needed to CLI handlers, service management, config, MQTT, or lifecycle code.

- [Implementing a Plugin](docs/implementing-a-plugin.md) — full developer guide
- [Shutdown feature](docs/features/shutdown.md) — reference feature documentation
- Cursor skill: `.cursor/skills/mewagents-feature-plugin/` — agent workflow for scaffolding plugins

## Dependencies

| Library | Purpose |
|---------|---------|
| [eclipse/paho.golang](https://github.com/eclipse/paho.golang) | MQTT v5 with autopaho reconnect |
| [kardianos/service](https://github.com/kardianos/service) | Cross-platform OS service management |
| [alecthomas/kong](https://github.com/alecthomas/kong) | CLI parsing |
| `log/slog` | Structured logging (stdlib) |

## License

MIT — see [LICENSE](LICENSE).

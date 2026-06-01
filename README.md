# mew-agents

Monorepo for the **Mew Agents** cross-platform agent platform, MQTT control UI, and ESP32 firmware.

## Layout

| Path | Description |
|------|-------------|
| [`apps/agents/`](apps/agents/) | Go agent (`mewagents`) — plugins, OS services, MQTT features |
| [`apps/web/`](apps/web/) | Vite/React UI for MQTT commands and broker settings |
| [`apps/firmware/`](apps/firmware/) | ESP-IDF Wake-on-LAN firmware (ESP32-S3) |

## Quick start

Requires [Go](https://go.dev/) 1.26.3+ for agents and [Node.js](https://nodejs.org/) for the web app. On Windows, use GNU Make (`make`) or run the equivalent `cd` commands from each app README.

```bash
# Agents: format, vet, test
make agents-check

# Agents: build binary (output: apps/agents/mewagents)
make agents-build

# Web: dev server
make web-dev

# Web: local Docker image
make web-docker-build
```

## Make targets

| Target | Description |
|--------|-------------|
| `agents-build` | Build `mewagents` in `apps/agents/` |
| `agents-test` | `go test ./...` |
| `agents-vet` | `go vet ./...` |
| `agents-fmt` | `gofmt -w` |
| `agents-check` | fmt + vet + test |
| `web-dev` | Vite dev server |
| `web-build` | Production build |
| `web-lint` | ESLint |
| `web-docker-build` | Build local image (`WEB_IMAGE`, default `mew-agents-web:local`) |
| `fw-set-target` | `idf.py set-target` (`IDF_TARGET`, default `esp32s3`) |
| `fw-build` | Build firmware (Windows: sources ESP-IDF profile) |
| `fw-flash` | Flash device (`PORT=COMx` optional) |

Run `make help` for the full list.

## License

MIT — see [apps/agents/LICENSE](apps/agents/LICENSE).

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

Agent install, CLI usage, configuration, and releases: **[apps/agents/README.md](apps/agents/README.md)**.

### Web Docker image (GHCR)

On push to `main` or version tags `v*`, CI builds and pushes:

`ghcr.io/<owner>/<repo>/web`

Examples: `latest` on `main`, `sha-<commit>` on every push, semver tags on `v*` releases.

Pull (after the workflow has run at least once):

```bash
docker pull ghcr.io/<owner>/<repo>/web:latest
docker run --rm -p 8080:80 ghcr.io/<owner>/<repo>/web:latest
```

Replace `<owner>/<repo>` with your GitHub repository (e.g. `mewisme/mew-agents`). Package visibility follows the repo; for private repos, authenticate with `docker login ghcr.io` using a PAT with `read:packages`.

Build args for MQTT defaults can be set at image build time — see [apps/web/Dockerfile](apps/web/Dockerfile) and [apps/web/docker-compose.yml](apps/web/docker-compose.yml).

Firmware (ESP-IDF on Windows): `make fw-set-target fw-build` (loads Espressif PowerShell profile automatically). See **[apps/firmware/README.md](apps/firmware/README.md)**.

## Adding a feature plugin

1. Read [apps/agents/docs/implementing-a-plugin.md](apps/agents/docs/implementing-a-plugin.md)
2. Use the [mewagents-feature-plugin](.cursor/skills/mewagents-feature-plugin/) Cursor skill for the full workflow
3. Reference implementation: `apps/agents/internal/features/shutdown/`

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

CI also publishes `ghcr.io/<owner>/<repo>/web` — see **Web Docker image (GHCR)** above.

## License

MIT — see [apps/agents/LICENSE](apps/agents/LICENSE).

# Mew Agents Web UI

Vite + React control UI for MQTT commands, broker settings, and PC actions (e.g. shutdown / WOL flows).

Part of the **mew-agents** monorepo (`apps/web/`). From the repo root: `make web-dev`, `make web-build`, `make web-docker-build`.

## Development

```bash
cd apps/web
pnpm install
pnpm dev
```

Or from monorepo root: `make web-dev`.

## Docker

### Local build

```bash
# from repo root
make web-docker-build

# or with a custom tag
make web-docker-build WEB_IMAGE=my-ui:local
```

Run:

```bash
docker run --rm -p 8080:80 mew-agents-web:local
```

### Compose (build-time MQTT env)

```bash
cd apps/web
cp .env.example .env   # if present; otherwise create .env
docker compose up --build
```

Build args (`VITE_MQTT_*`) are baked in at image build time. Override via `docker-compose.yml` `build.args` or `docker build --build-arg`.

### GitHub Container Registry

CI (`.github/workflows/web-release.yml`) runs on git tags `v*` and pushes:

```text
ghcr.io/<owner>/<repo>/mew-agents-web:latest      # always on each release
ghcr.io/<owner>/<repo>/mew-agents-web:v1.0.0      # matches the Git tag
ghcr.io/<owner>/<repo>/mew-agents-web:1.0.0       # semver (no v prefix)
```

```bash
git tag v1.0.0 && git push origin v1.0.0
docker login ghcr.io
docker pull ghcr.io/<owner>/<repo>/mew-agents-web:v1.0.0
docker run --rm -p 8080:80 ghcr.io/<owner>/<repo>/mew-agents-web:latest
```

For private repositories, use a GitHub PAT with `read:packages` when logging in.

## Stack

- Vite, React, TypeScript
- MQTT.js, shadcn/ui, Tailwind CSS
- Production image: multi-stage build → nginx (see [Dockerfile](Dockerfile))

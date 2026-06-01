# WOL Service (ESP32-S3)

ESP-IDF firmware that connects to Wi-Fi and MQTT, then sends Wake-on-LAN magic packets when it receives messages on `wakeup/<MAC>` topics.

## Target

- **SoC:** ESP32-S3
- **ESP-IDF:** v5.5.3

## Build

1. Load the ESP-IDF environment (if `idf.py` is not in PATH):
   ```powershell
   . "C:\Espressif\tools\Microsoft.v5.5.3.PowerShell_profile.ps1"
   ```
2. Set target and build:
   ```bash
   idf.py set-target esp32s3
   idf.py build
   ```

## Configuration

Run `idf.py menuconfig` and open **WOL Service** to set:

- **Wi-Fi:** SSID, password
- **MQTT:** Broker URI, username, password
- **Target PC:** Optional fallback MAC (when the topic has no MAC segment), WOL UDP port (default 9)
- **Redis:** `REDIS_URL` only (e.g. `redis://username:password@host:6379`); caches MACs from `wakeup/<MAC>` topics automatically

## MQTT topics

| Action | Topic |
|--------|--------|
| Subscribe (device) | `wakeup/+` |
| Publish to wake | `wakeup/<MAC>` (`:`, `-`, or no separators) |
| Result | `wakeup/AA:BB:CC:DD:EE:FF/result` |
| Get recent MACs | Publish to `mac/list/get` → response on `mac/list` |

See [docs/TOPICS.md](docs/TOPICS.md) and `schemas/wakeup-result.schema.json`.

## Web UI

Browser dashboard in [`ui/`](ui/) for waking PCs and monitoring results over MQTT.

```bash
cd ui
cp .env.example .env   # optional: set VITE_MQTT_* before first run
pnpm install
pnpm dev
```

Configure the broker via **`ui/.env`** (loaded at dev/build time) or **Settings** in the app (saved to `localStorage`, overrides `.env`):

| Variable | Purpose |
|----------|---------|
| `VITE_MQTT_URI` | WebSocket URI (`wss://<cluster>.s1.eu.hivemq.cloud:8884/mqtt`) |
| `VITE_MQTT_USERNAME` | HiveMQ username |
| `VITE_MQTT_PASSWORD` | HiveMQ password |
| `VITE_MQTT_CLIENT_ID` | Optional client ID (default: `wol_ui_<random>`) |
| `VITE_MQTT_AUTO_RECONNECT` | `true` / `false` (default: `true`) |

The ESP32 uses `mqtts://` on port **8883** with the same topics.

| UI action | MQTT topic |
|-----------|------------|
| Wake PC | Publish → `wakeup/<MAC>` |
| View result | Subscribe → `wakeup/+/result` |
| Refresh MAC list | Publish → `mac/list/get` |
| Receive MAC list | Subscribe → `mac/list` |

Build for production: `pnpm build` (output in `ui/dist/`).

## Flash

```bash
idf.py -p PORT flash monitor
```

Firmware binary: `build/wol-service.bin` (CMake project `wol-service`).

## Notes

- Wake uses subnet broadcast; the ESP must be on the same L2 segment as the PC.
- MQTT client ID is derived from the chip Wi-Fi MAC (`esp32_aabbcc` style).
- Boards with **16 MB** flash: `sdkconfig.defaults` sets flash size to 16 MB. If your module is **2 MB**, run `idf.py menuconfig` → **Serial flasher config** → **Flash size** → **2 MB**, or remove/change `sdkconfig.defaults`.

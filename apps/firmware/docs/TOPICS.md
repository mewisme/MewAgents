# MQTT Topics

| Topic | Direction | Purpose | QoS |
|-------|-----------|---------|-----|
| `#` | Subscribe | Log all broker messages; commands handled only on `wakeup/<MAC>` and `mac/list/get` | 1 |
| `wakeup/{mac}/result` | Publish | Wake attempt result JSON, schema: `schemas/wakeup-result.schema.json` | 1 |
| `mac/list/get` | Subscribe | Request recent MAC list from Redis | 1 |
| `mac/list` | Publish | Recent MACs JSON (`{"macs":["AA:BB:..."]}`) | 1 |

## Wake a PC

Publish any payload (or empty) to:

```
wakeup/AA:BB:CC:DD:EE:FF
```

MAC formats: `AA:BB:CC:DD:EE:FF`, `AA-BB-CC-DD-EE-FF`, or `AABBCCDDEEFF` (case-insensitive hex).

## Result

Example on `wakeup/AA:BB:CC:DD:EE:FF/result`:

```json
{"status":"sent","mac":"AA:BB:CC:DD:EE:FF","broadcast":"192.168.1.255"}
```

## Recent MAC list (Redis)

Requires `REDIS_URL` in menuconfig (e.g. `redis://user:secret@192.168.1.10:6379`).

On boot, `TARGET_MAC` from menuconfig is added to Redis when set. Each `wakeup/<MAC>` message also caches that MAC in Redis list `mac:recents` (newest first, max 20). Request the list:

```
Publish (any payload) → mac/list/get
Response on mac/list → {"macs":["FC:9D:05:20:B6:35","AA:BB:CC:DD:EE:FF"]}
```

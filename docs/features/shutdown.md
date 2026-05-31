# Shutdown

Remote two-step machine shutdown over MQTT v5. The agent listens for topic-based commands keyed by the host's active network interface MAC addresses.

## Install and run

```bash
# Install as a system service
mewagents install shutdown \
  --url mqtt://broker.example.com:1883 \
  --username admin \
  --password secret

# Short flags
mewagents install shutdown -u mqtt://broker.example.com:1883 -n admin -p secret

# Run in foreground (Ctrl+C for graceful shutdown)
mewagents console shutdown

# Run with inline config flags (no saved config file required)
mewagents console shutdown \
  --url mqtt://broker.example.com:1883 \
  --username admin \
  --password secret

mewagents console shutdown -u mqtt://broker.example.com:1883 -n admin -p secret

# Remove the service (configuration is kept)
mewagents uninstall shutdown
```

## Configuration

| Flag | Short | Required | Description |
|------|-------|----------|-------------|
| `--url` | `-u` | yes | MQTT broker URL (`mqtt://` or `mqtts://`) |
| `--username` | `-n` | yes | MQTT username |
| `--password` | `-p` | yes | MQTT password |

Config is stored in the platform path described in the [core README](../../README.md#configuration).

## MQTT protocol

Topics are derived from the machine's active network interface MAC addresses:

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

## Platform shutdown

Supported shutdown commands (no shell execution):

| OS | Command |
|----|---------|
| Windows | `shutdown /s /t 0` |
| Linux | `shutdown -h now` |
| macOS | `osascript` → System Events shut down |

## Source

Reference implementation: [`internal/features/shutdown/`](../../internal/features/shutdown/)

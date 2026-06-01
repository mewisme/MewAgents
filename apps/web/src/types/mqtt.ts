export type WakeupResultStatus = "sent" | "error"

export type WakeupResult = {
  status: WakeupResultStatus
  mac: string
  broadcast: string
  message?: string
}

export type MacListResponse = {
  macs: string[]
  error?: string
}

export type MqttConnectionState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error"

export type WakeupResultEntry = WakeupResult & {
  id: string
  topic: string
  receivedAt: Date
}

export type MqttMessageDirection = "rx" | "tx"

export type MqttMessageLogEntry = {
  id: string
  topic: string
  payload: string
  direction: MqttMessageDirection
  receivedAt: Date
}

export type MqttConfig = {
  uri: string
  username: string
  password: string
  clientId: string
  autoReconnect: boolean
}

export type MqttManagerEvents = {
  connectionState: MqttConnectionState
  lastError: string | null
  wakeupResult: WakeupResultEntry
  macList: MacListResponse
}

export const STORAGE_KEYS = {
  uri: "wol.mqtt.uri",
  user: "wol.mqtt.user",
  pass: "wol.mqtt.pass",
  clientId: "wol.mqtt.clientId",
  autoReconnect: "wol.mqtt.autoReconnect",
} as const

export const DEFAULT_MQTT_URI =
  "wss://YOUR_CLUSTER.s1.eu.hivemq.cloud:8884/mqtt"

function envString(key: keyof ImportMetaEnv): string | undefined {
  const value = import.meta.env[key]
  if (typeof value !== "string") {
    return undefined
  }
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function envAutoReconnect(): boolean {
  const value = envString("VITE_MQTT_AUTO_RECONNECT")
  if (value === undefined) {
    return true
  }
  return value !== "false"
}

export function isPlaceholderMqttUri(uri: string): boolean {
  return uri.includes("YOUR_CLUSTER")
}

export function loadMqttEnvDefaults(): MqttConfig {
  return {
    uri: envString("VITE_MQTT_URI") ?? DEFAULT_MQTT_URI,
    username: envString("VITE_MQTT_USERNAME") ?? "",
    password: envString("VITE_MQTT_PASSWORD") ?? "",
    clientId: envString("VITE_MQTT_CLIENT_ID") ?? "",
    autoReconnect: envAutoReconnect(),
  }
}

export function createClientId(): string {
  const suffix = Math.random().toString(16).slice(2, 8)
  return `wol_ui_${suffix}`
}

export function loadMqttConfig(): MqttConfig {
  const env = loadMqttEnvDefaults()
  const storedAutoReconnect = localStorage.getItem(STORAGE_KEYS.autoReconnect)
  const storedId = localStorage.getItem(STORAGE_KEYS.clientId)

  return {
    uri: localStorage.getItem(STORAGE_KEYS.uri) ?? env.uri,
    username: localStorage.getItem(STORAGE_KEYS.user) ?? env.username,
    password: localStorage.getItem(STORAGE_KEYS.pass) ?? env.password,
    clientId: storedId?.trim() || env.clientId || createClientId(),
    autoReconnect:
      storedAutoReconnect !== null
        ? storedAutoReconnect !== "false"
        : env.autoReconnect,
  }
}

export function saveMqttConfig(config: MqttConfig): void {
  localStorage.setItem(STORAGE_KEYS.uri, config.uri)
  localStorage.setItem(STORAGE_KEYS.user, config.username)
  localStorage.setItem(STORAGE_KEYS.pass, config.password)
  localStorage.setItem(STORAGE_KEYS.clientId, config.clientId)
  localStorage.setItem(
    STORAGE_KEYS.autoReconnect,
    String(config.autoReconnect)
  )
}

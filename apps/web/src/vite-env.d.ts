/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MQTT_URI?: string
  readonly VITE_MQTT_USERNAME?: string
  readonly VITE_MQTT_PASSWORD?: string
  readonly VITE_MQTT_CLIENT_ID?: string
  readonly VITE_MQTT_AUTO_RECONNECT?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

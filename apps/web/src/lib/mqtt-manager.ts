import mqtt, { type MqttClient } from "mqtt"

import {
  MAC_LIST_GET_TOPIC,
  MAC_LIST_TOPIC,
  MQTT_QOS,
  MQTT_SUB_ALL,
  shutdownCancelTopic,
  shutdownConfirmTopic,
  shutdownTopic,
  wakeupTopic,
  isWakeupResultTopic,
} from "@/lib/topics"
import { normalizeMacForTopic } from "@/lib/mac"
import type {
  MacListResponse,
  MqttConfig,
  MqttConnectionState,
  MqttMessageDirection,
  MqttMessageLogEntry,
  WakeupResult,
  WakeupResultEntry,
} from "@/types/mqtt"

const MESSAGE_LOG_MAX = 500
const PAYLOAD_LOG_MAX = 512

type Listener = () => void

class MqttManager {
  private client: MqttClient | null = null
  private connectionState: MqttConnectionState = "disconnected"
  private lastError: string | null = null
  private recentMacs: string[] = []
  private results: WakeupResultEntry[] = []
  private messageLog: MqttMessageLogEntry[] = []
  private listeners = new Set<Listener>()

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener()
    }
  }

  getConnectionState(): MqttConnectionState {
    return this.connectionState
  }

  getLastError(): string | null {
    return this.lastError
  }

  getRecentMacs(): string[] {
    return this.recentMacs
  }

  getResults(): WakeupResultEntry[] {
    return this.results
  }

  getMessageLog(): MqttMessageLogEntry[] {
    return this.messageLog
  }

  isConnected(): boolean {
    return this.connectionState === "connected"
  }

  clearResults(): void {
    this.results = []
    this.notify()
  }

  clearMessageLog(): void {
    this.messageLog = []
    this.notify()
  }

  clearLogs(): void {
    this.results = []
    this.messageLog = []
    this.notify()
  }

  private appendMessageLog(
    topic: string,
    payload: string,
    direction: MqttMessageDirection
  ): void {
    const truncated =
      payload.length > PAYLOAD_LOG_MAX
        ? `${payload.slice(0, PAYLOAD_LOG_MAX)}…`
        : payload
    const entry: MqttMessageLogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      topic,
      payload: truncated,
      direction,
      receivedAt: new Date(),
    }
    this.messageLog = [entry, ...this.messageLog].slice(0, MESSAGE_LOG_MAX)
  }

  private setConnectionState(state: MqttConnectionState, error?: string): void {
    this.connectionState = state
    this.lastError = error ?? (state === "connected" ? null : this.lastError)
    this.notify()
  }

  private onConnected(): void {
    this.setConnectionState("connected")
    if (!this.client) {
      return
    }
    this.client.subscribe(MQTT_SUB_ALL, { qos: MQTT_QOS })
    this.requestMacList()
  }

  private handleMessage(topic: string, payload: Buffer): void {
    const text = payload.toString()
    this.appendMessageLog(topic, text, "rx")

    if (topic === MAC_LIST_TOPIC) {
      this.handleMacList(text)
      return
    }

    if (isWakeupResultTopic(topic)) {
      this.handleWakeupResult(topic, text)
    }
  }

  private handleMacList(payload: string): void {
    try {
      const data = JSON.parse(payload) as MacListResponse
      if (!Array.isArray(data.macs)) {
        throw new Error("invalid mac list payload")
      }
      this.recentMacs = data.macs
      this.notify()
    } catch {
      this.lastError = "Failed to parse mac/list payload"
      this.notify()
    }
  }

  private handleWakeupResult(topic: string, payload: string): void {
    try {
      const data = JSON.parse(payload) as WakeupResult
      const entry: WakeupResultEntry = {
        ...data,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        topic,
        receivedAt: new Date(),
      }
      this.results = [entry, ...this.results].slice(0, 200)
      this.notify()
    } catch {
      this.lastError = "Failed to parse wakeup result payload"
      this.notify()
    }
  }

  connect(config: MqttConfig): void {
    this.disconnect(false)
    this.setConnectionState("connecting")

    this.client = mqtt.connect(config.uri, {
      clientId: config.clientId,
      username: config.username || undefined,
      password: config.password || undefined,
      reconnectPeriod: config.autoReconnect ? 3000 : 0,
      connectTimeout: 15000,
      clean: true,
    })

    this.client.on("connect", () => this.onConnected())

    this.client.on("reconnect", () => {
      this.setConnectionState("connecting")
    })

    this.client.on("close", () => {
      if (this.connectionState !== "error") {
        this.setConnectionState("disconnected")
      }
    })

    this.client.on("error", (err) => {
      this.setConnectionState("error", err.message)
    })

    this.client.on("message", (topic, payload) => {
      this.handleMessage(topic, payload)
    })
  }

  disconnect(notify = true): void {
    if (this.client) {
      this.client.removeAllListeners()
      this.client.end(true)
      this.client = null
    }
    if (notify) {
      this.setConnectionState("disconnected")
    }
  }

  private publishCommand(topic: string): boolean {
    if (!this.client || !this.isConnected()) {
      this.lastError = "Not connected to broker"
      this.notify()
      return false
    }
    this.client.publish(topic, "", { qos: MQTT_QOS })
    this.appendMessageLog(topic, "", "tx")
    return true
  }

  wake(mac: string): boolean {
    const normalized = normalizeMacForTopic(mac)
    return this.publishCommand(wakeupTopic(normalized))
  }

  shutdownRequest(mac: string): boolean {
    const normalized = normalizeMacForTopic(mac)
    return this.publishCommand(shutdownTopic(normalized))
  }

  shutdownConfirm(mac: string): boolean {
    const normalized = normalizeMacForTopic(mac)
    return this.publishCommand(shutdownConfirmTopic(normalized))
  }

  shutdownCancel(mac: string): boolean {
    const normalized = normalizeMacForTopic(mac)
    return this.publishCommand(shutdownCancelTopic(normalized))
  }

  requestMacList(): boolean {
    if (!this.client || !this.isConnected()) {
      this.lastError = "Not connected to broker"
      this.notify()
      return false
    }
    this.client.publish(MAC_LIST_GET_TOPIC, "", { qos: MQTT_QOS })
    this.appendMessageLog(MAC_LIST_GET_TOPIC, "", "tx")
    return true
  }
}

export const mqttManager = new MqttManager()

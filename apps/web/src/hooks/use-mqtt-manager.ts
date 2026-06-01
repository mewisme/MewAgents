import { useCallback, useEffect, useState, useSyncExternalStore } from "react"

import { mqttManager } from "@/lib/mqtt-manager"
import {
  isPlaceholderMqttUri,
  loadMqttConfig,
  saveMqttConfig,
  type MqttConfig,
} from "@/types/mqtt"

type MqttStoreSnapshot = {
  connectionState: ReturnType<typeof mqttManager.getConnectionState>
  lastError: ReturnType<typeof mqttManager.getLastError>
  recentMacs: ReturnType<typeof mqttManager.getRecentMacs>
  results: ReturnType<typeof mqttManager.getResults>
  messageLog: ReturnType<typeof mqttManager.getMessageLog>
  isConnected: boolean
}

function buildSnapshot(): MqttStoreSnapshot {
  return {
    connectionState: mqttManager.getConnectionState(),
    lastError: mqttManager.getLastError(),
    recentMacs: mqttManager.getRecentMacs(),
    results: mqttManager.getResults(),
    messageLog: mqttManager.getMessageLog(),
    isConnected: mqttManager.isConnected(),
  }
}

let snapshot = buildSnapshot()

function subscribe(listener: () => void): () => void {
  return mqttManager.subscribe(() => {
    snapshot = buildSnapshot()
    listener()
  })
}

function getSnapshot(): MqttStoreSnapshot {
  return snapshot
}

export function useMqttManager() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  const [config, setConfig] = useState(loadMqttConfig)

  const connect = useCallback((nextConfig?: MqttConfig) => {
    const cfg = nextConfig ?? config
    saveMqttConfig(cfg)
    setConfig(cfg)
    mqttManager.connect(cfg)
  }, [config])

  const disconnect = useCallback(() => {
    mqttManager.disconnect()
  }, [])

  const wake = useCallback((mac: string) => mqttManager.wake(mac), [])

  const shutdownRequest = useCallback(
    (mac: string) => mqttManager.shutdownRequest(mac),
    []
  )

  const shutdownConfirm = useCallback(
    (mac: string) => mqttManager.shutdownConfirm(mac),
    []
  )

  const shutdownCancel = useCallback(
    (mac: string) => mqttManager.shutdownCancel(mac),
    []
  )

  const requestMacList = useCallback(() => mqttManager.requestMacList(), [])

  const clearResults = useCallback(() => mqttManager.clearResults(), [])

  const clearLogs = useCallback(() => mqttManager.clearLogs(), [])

  const updateConfig = useCallback((nextConfig: MqttConfig) => {
    saveMqttConfig(nextConfig)
    setConfig(nextConfig)
  }, [])

  useEffect(() => {
    const initial = loadMqttConfig()
    if (
      initial.autoReconnect &&
      initial.uri &&
      !isPlaceholderMqttUri(initial.uri)
    ) {
      mqttManager.connect(initial)
    }
  }, [])

  return {
    ...state,
    config,
    connect,
    disconnect,
    wake,
    shutdownRequest,
    shutdownConfirm,
    shutdownCancel,
    requestMacList,
    clearResults,
    clearLogs,
    updateConfig,
  }
}

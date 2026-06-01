/** Topic constants mirroring main/mqtt_manager.c */

export const WAKEUP_PREFIX = "wakeup/"
export const WAKEUP_SUB = "wakeup/+"
export const WAKEUP_RESULT_SUB = "wakeup/+/result"
export const WAKEUP_RESULT_SUFFIX = "/result"
export const SHUTDOWN_PREFIX = "shutdown/"
export const SHUTDOWN_SUB = "shutdown/+"
export const SHUTDOWN_CONFIRM_SUFFIX = "/confirm"
export const SHUTDOWN_CANCEL_SUFFIX = "/cancel"
export const MAC_LIST_GET_TOPIC = "mac/list/get"
export const MAC_LIST_TOPIC = "mac/list"
export const MQTT_SUB_ALL = "#"
export const MQTT_QOS = 1 as const

/** Topics the ESP32 (or UI) acts on — mirrors is_mqtt_command_topic in mqtt_manager.c */
export function isMqttCommandTopic(topic: string): boolean {
  if (topic === MAC_LIST_GET_TOPIC) {
    return true
  }
  if (topic.startsWith(WAKEUP_PREFIX)) {
    const mac = topic.slice(WAKEUP_PREFIX.length)
    return mac.length > 0 && !mac.includes("/")
  }
  if (topic.startsWith(SHUTDOWN_PREFIX)) {
    const rest = topic.slice(SHUTDOWN_PREFIX.length)
    if (rest.length === 0) {
      return false
    }
    if (!rest.includes("/")) {
      return true
    }
    for (const suffix of [SHUTDOWN_CONFIRM_SUFFIX, SHUTDOWN_CANCEL_SUFFIX]) {
      if (rest.endsWith(suffix)) {
        const mac = rest.slice(0, -suffix.length)
        return mac.length > 0 && !mac.includes("/")
      }
    }
  }
  return false
}

export function wakeupTopic(mac: string): string {
  return `${WAKEUP_PREFIX}${mac}`
}

export function shutdownTopic(mac: string): string {
  return `${SHUTDOWN_PREFIX}${mac}`
}

export function shutdownConfirmTopic(mac: string): string {
  return `${SHUTDOWN_PREFIX}${mac}${SHUTDOWN_CONFIRM_SUFFIX}`
}

export function shutdownCancelTopic(mac: string): string {
  return `${SHUTDOWN_PREFIX}${mac}${SHUTDOWN_CANCEL_SUFFIX}`
}

export function wakeupResultTopic(mac: string): string {
  return `${WAKEUP_PREFIX}${mac}${WAKEUP_RESULT_SUFFIX}`
}

export function isWakeupResultTopic(topic: string): boolean {
  if (!topic.startsWith(WAKEUP_PREFIX) || !topic.endsWith(WAKEUP_RESULT_SUFFIX)) {
    return false
  }
  const mac = topic.slice(WAKEUP_PREFIX.length, -WAKEUP_RESULT_SUFFIX.length)
  return mac.length > 0 && mac !== "result"
}

export function extractMacFromResultTopic(topic: string): string | null {
  if (!isWakeupResultTopic(topic)) {
    return null
  }
  return topic.slice(WAKEUP_PREFIX.length, -WAKEUP_RESULT_SUFFIX.length)
}

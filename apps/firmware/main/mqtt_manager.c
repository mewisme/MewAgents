#include "mqtt_manager.h"
#include "config.h"
#include "esp_crt_bundle.h"
#include "esp_log.h"
#include "esp_mac.h"
#include "esp_netif.h"
#include "freertos/FreeRTOS.h"
#include "freertos/queue.h"
#include "freertos/task.h"
#include "mqtt_client.h"
#include "redis_client.h"
#include "wol_sender.h"
#include <stdio.h>
#include <string.h>

static const char *TAG = "mqtt";
static esp_mqtt_client_handle_t s_client = NULL;
static volatile bool s_connected = false;
static app_config_t s_config;
static redis_cfg_t s_redis;

#define TOPIC_MAX 128
#define MAC_TOPIC_MAX 24
#define MAC_LIST_PAYLOAD_MAX 1024
#define WAKEUP_PREFIX "wakeup/"
#define WAKEUP_SUB "wakeup/+"
#define WAKEUP_RESULT_SUFFIX "/result"
#define MAC_LIST_GET_TOPIC "mac/list/get"
#define MAC_LIST_TOPIC "mac/list"
#define MQTT_SUB_ALL "#"
#define MQTT_PAYLOAD_LOG_MAX 512
#define REDIS_WORKER_STACK 8192
#define REDIS_QUEUE_LEN 4

typedef enum {
  REDIS_JOB_SEED,
  REDIS_JOB_PUSH,
  REDIS_JOB_LIST,
} redis_job_op_t;

typedef struct {
  redis_job_op_t op;
  char mac[CONFIG_MAC_STR_LEN];
} redis_job_t;

static QueueHandle_t s_redis_queue = NULL;

static void log_mqtt_in(const char *topic, const char *payload,
                        int payload_len) {
  if (payload != NULL && payload_len > 0) {
    ESP_LOGI(TAG, "RX topic=%s payload=%.*s", topic, payload_len, payload);
  } else {
    ESP_LOGI(TAG, "RX topic=%s payload=(empty)", topic);
  }
}

static bool is_mqtt_command_topic(const char *topic) {
  if (strcmp(topic, MAC_LIST_GET_TOPIC) == 0) {
    return true;
  }
  const char *prefix = WAKEUP_PREFIX;
  size_t prefix_len = strlen(prefix);
  if (strncmp(topic, prefix, prefix_len) != 0) {
    return false;
  }
  const char *mac = topic + prefix_len;
  if (mac[0] == '\0' || strchr(mac, '/') != NULL) {
    return false;
  }
  return true;
}

static void log_mqtt_out(const char *topic, const char *payload) {
  ESP_LOGI(TAG, "TX topic=%s payload=%s", topic,
           payload != NULL ? payload : "");
}

static bool get_subnet_broadcast(char *buf, size_t buf_len) {
  esp_netif_t *netif = esp_netif_get_handle_from_ifkey("WIFI_STA_DEF");
  if (netif == NULL) {
    return false;
  }
  esp_netif_ip_info_t ip_info;
  if (esp_netif_get_ip_info(netif, &ip_info) != ESP_OK) {
    return false;
  }
  esp_ip4_addr_t bcast;
  bcast.addr = ip_info.ip.addr | ~ip_info.netmask.addr;
  snprintf(buf, buf_len, IPSTR, IP2STR(&bcast));
  return true;
}

static bool extract_mac_from_topic(const char *topic, char *mac_out,
                                   size_t mac_out_len) {
  const char *prefix = WAKEUP_PREFIX;
  size_t prefix_len = strlen(prefix);
  if (strncmp(topic, prefix, prefix_len) != 0) {
    return false;
  }
  const char *mac = topic + prefix_len;
  if (mac[0] == '\0' || strcmp(mac, "result") == 0) {
    return false;
  }
  if (strlen(mac) >= mac_out_len) {
    return false;
  }
  strncpy(mac_out, mac, mac_out_len - 1);
  mac_out[mac_out_len - 1] = '\0';
  return true;
}

static void publish_wakeup_result(const char *status, const char *mac,
                                  const char *broadcast, const char *message) {
  if (s_client == NULL) {
    return;
  }
  const char *mac_seg = (mac != NULL && mac[0] != '\0') ? mac : "unknown";
  char topic[TOPIC_MAX];
  snprintf(topic, sizeof(topic), WAKEUP_PREFIX "%s" WAKEUP_RESULT_SUFFIX,
           mac_seg);

  char payload[256];
  if (message != NULL && message[0] != '\0') {
    snprintf(payload, sizeof(payload),
             "{\"status\":\"%s\",\"mac\":\"%s\",\"broadcast\":\"%s\","
             "\"message\":\"%s\"}",
             status, mac, broadcast, message);
  } else {
    snprintf(payload, sizeof(payload),
             "{\"status\":\"%s\",\"mac\":\"%s\",\"broadcast\":\"%s\"}", status,
             mac, broadcast);
  }
  log_mqtt_out(topic, payload);
  esp_mqtt_client_publish(s_client, topic, payload, 0, 1, 0);
}

static void publish_mac_list(const char *payload) {
  if (s_client == NULL || payload == NULL) {
    return;
  }
  log_mqtt_out(MAC_LIST_TOPIC, payload);
  esp_mqtt_client_publish(s_client, MAC_LIST_TOPIC, payload, 0, 1, 0);
}

static void handle_mac_list_get(void) {
  ESP_LOGI(TAG, "handle mac/list/get");
  char payload[MAC_LIST_PAYLOAD_MAX];
  if (!s_redis.enabled) {
    ESP_LOGW(TAG, "redis disabled");
    snprintf(payload, sizeof(payload),
             "{\"macs\":[],\"error\":\"redis disabled\"}");
    publish_mac_list(payload);
    return;
  }

  char macs[REDIS_MAC_RECENTS_MAX][REDIS_MAC_STR_LEN];
  int count = 0;
  if (!redis_mac_cache_list(&s_redis, macs, REDIS_MAC_RECENTS_MAX, &count)) {
    ESP_LOGW(TAG, "redis list failed");
    snprintf(payload, sizeof(payload),
             "{\"macs\":[],\"error\":\"redis unavailable\"}");
    publish_mac_list(payload);
    return;
  }
  for (int i = 0; i < count; i++) {
    ESP_LOGI(TAG, "redis mac[%d]=%s", i, macs[i]);
  }

  size_t off = 0;
  off += (size_t)snprintf(payload + off, sizeof(payload) - off, "{\"macs\":[");
  for (int i = 0; i < count; i++) {
    if (i > 0) {
      off += (size_t)snprintf(payload + off, sizeof(payload) - off, ",");
    }
    off += (size_t)snprintf(payload + off, sizeof(payload) - off, "\"%s\"",
                            macs[i]);
    if (off >= sizeof(payload) - 4) {
      break;
    }
  }
  snprintf(payload + off, sizeof(payload) - off, "]}");
  publish_mac_list(payload);
  ESP_LOGI(TAG, "published %s (%d macs)", MAC_LIST_TOPIC, count);
}

static void cache_mac_from_topic(const char *mac_canonical) {
  if (!s_redis.enabled || mac_canonical == NULL || mac_canonical[0] == '\0') {
    return;
  }
  if (s_redis_queue == NULL) {
    return;
  }
  redis_job_t job = {.op = REDIS_JOB_PUSH};
  strncpy(job.mac, mac_canonical, sizeof(job.mac) - 1);
  if (xQueueSend(s_redis_queue, &job, 0) != pdTRUE) {
    ESP_LOGW(TAG, "redis queue full (push)");
  }
}

static void redis_do_push(const char *mac_canonical) {
  ESP_LOGI(TAG, "redis cache push %s", mac_canonical);
  if (!redis_mac_cache_push(&s_redis, mac_canonical)) {
    ESP_LOGW(TAG, "redis cache push failed for %s", mac_canonical);
  }
}

static void seed_fallback_mac_to_redis(void) {
  if (!s_redis.enabled || s_config.target_mac[0] == '\0') {
    return;
  }
  uint8_t mac[6];
  if (!wol_sender_parse_mac(s_config.target_mac, mac)) {
    ESP_LOGW(TAG, "TARGET_MAC invalid, not seeding redis");
    return;
  }
  char mac_canonical[18];
  wol_sender_format_mac(mac, mac_canonical, sizeof(mac_canonical));
  redis_do_push(mac_canonical);
  ESP_LOGI(TAG, "seeded fallback MAC %s to redis", mac_canonical);
}

static void redis_worker_task(void *arg) {
  (void)arg;
  redis_job_t job;
  for (;;) {
    if (xQueueReceive(s_redis_queue, &job, portMAX_DELAY) != pdTRUE) {
      continue;
    }
    switch (job.op) {
    case REDIS_JOB_SEED:
      seed_fallback_mac_to_redis();
      break;
    case REDIS_JOB_PUSH:
      if (job.mac[0] != '\0') {
        redis_do_push(job.mac);
      }
      break;
    case REDIS_JOB_LIST:
      handle_mac_list_get();
      break;
    default:
      break;
    }
  }
}

static bool redis_queue_job(redis_job_op_t op, const char *mac) {
  if (s_redis_queue == NULL || !s_redis.enabled) {
    return false;
  }
  redis_job_t job = {.op = op};
  if (mac != NULL && mac[0] != '\0') {
    strncpy(job.mac, mac, sizeof(job.mac) - 1);
  }
  return xQueueSend(s_redis_queue, &job, 0) == pdTRUE;
}

static void redis_worker_start(void) {
  if (!s_redis.enabled || s_redis_queue != NULL) {
    return;
  }
  s_redis_queue = xQueueCreate(REDIS_QUEUE_LEN, sizeof(redis_job_t));
  if (s_redis_queue == NULL) {
    ESP_LOGE(TAG, "redis queue create failed");
    return;
  }
  BaseType_t ok = xTaskCreate(redis_worker_task, "redis", REDIS_WORKER_STACK,
                              NULL, 5, NULL);
  if (ok != pdPASS) {
    ESP_LOGE(TAG, "redis task create failed");
    vQueueDelete(s_redis_queue);
    s_redis_queue = NULL;
    return;
  }
  ESP_LOGI(TAG, "redis worker started");
}

static void handle_wakeup_topic(const char *topic) {
  ESP_LOGI(TAG, "handle wakeup topic=%s", topic);
  char mac_str[MAC_TOPIC_MAX];
  bool mac_from_topic = extract_mac_from_topic(topic, mac_str, sizeof(mac_str));
  if (!mac_from_topic) {
    if (s_config.target_mac[0] != '\0') {
      strncpy(mac_str, s_config.target_mac, sizeof(mac_str) - 1);
      mac_str[sizeof(mac_str) - 1] = '\0';
    } else {
      ESP_LOGW(TAG, "no MAC in topic and no default TARGET_MAC");
      publish_wakeup_result("error", "", "", "missing MAC in topic");
      return;
    }
  }

  uint8_t mac[6];
  if (!wol_sender_parse_mac(mac_str, mac)) {
    ESP_LOGW(TAG, "invalid MAC: %s", mac_str);
    publish_wakeup_result("error", mac_str, "", "invalid MAC");
    return;
  }

  char mac_canonical[18];
  wol_sender_format_mac(mac, mac_canonical, sizeof(mac_canonical));

  if (mac_from_topic) {
    cache_mac_from_topic(mac_canonical);
  }

  char bcast_ip[16];
  if (!get_subnet_broadcast(bcast_ip, sizeof(bcast_ip))) {
    ESP_LOGW(TAG, "subnet broadcast unavailable");
    publish_wakeup_result("error", mac_canonical, "", "Wi-Fi IP not ready");
    return;
  }
  ESP_LOGI(TAG, "WOL target=%s bcast=%s port=%u", mac_canonical, bcast_ip,
           s_config.wol_port);

  bool sent = wol_sender_send(mac, bcast_ip, s_config.wol_port);
  if (sent) {
    ESP_LOGI(TAG, "WOL sent to %s via %s:%u", mac_canonical, bcast_ip,
             s_config.wol_port);
    publish_wakeup_result("sent", mac_canonical, bcast_ip, NULL);
  } else {
    ESP_LOGW(TAG, "WOL send failed for %s", mac_canonical);
    publish_wakeup_result("error", mac_canonical, bcast_ip, "send failed");
  }
}

static void mqtt_event_handler(void *handler_args, esp_event_base_t base,
                               int32_t event_id, void *event_data) {
  esp_mqtt_event_handle_t event = (esp_mqtt_event_handle_t)event_data;
  switch ((esp_mqtt_event_id_t)event_id) {
  case MQTT_EVENT_BEFORE_CONNECT:
    ESP_LOGI(TAG, "connecting to broker...");
    break;
  case MQTT_EVENT_CONNECTED:
    s_connected = true;
    ESP_LOGI(TAG, "broker connected");
    esp_mqtt_client_subscribe(s_client, MQTT_SUB_ALL, 1);
    ESP_LOGI(TAG, "subscribe %s (log all; commands: %s, %s)", MQTT_SUB_ALL,
             WAKEUP_SUB, MAC_LIST_GET_TOPIC);
    break;
  case MQTT_EVENT_DISCONNECTED:
    s_connected = false;
    ESP_LOGW(TAG, "broker disconnected");
    break;
  case MQTT_EVENT_SUBSCRIBED:
    ESP_LOGI(TAG, "subscribed msg_id=%d", event->msg_id);
    break;
  case MQTT_EVENT_PUBLISHED:
    ESP_LOGI(TAG, "publish ack msg_id=%d", event->msg_id);
    break;
  case MQTT_EVENT_ERROR:
    if (event->error_handle != NULL) {
      ESP_LOGE(TAG, "mqtt error type=%d", event->error_handle->error_type);
      if (event->error_handle->esp_tls_last_esp_err != 0) {
        ESP_LOGE(TAG, "tls err=0x%x",
                 event->error_handle->esp_tls_last_esp_err);
      }
      if (event->error_handle->connect_return_code != 0) {
        ESP_LOGE(TAG, "connect return code=%d",
                 event->error_handle->connect_return_code);
      }
    } else {
      ESP_LOGE(TAG, "mqtt error (no detail)");
    }
    break;
  case MQTT_EVENT_DATA: {
    if (event->topic_len <= 0 || event->topic_len >= TOPIC_MAX) {
      ESP_LOGW(TAG, "RX ignored (topic_len=%d)", event->topic_len);
      break;
    }
    char topic[TOPIC_MAX];
    memcpy(topic, event->topic, (size_t)event->topic_len);
    topic[event->topic_len] = '\0';

    char payload[MQTT_PAYLOAD_LOG_MAX];
    if (event->data_len > 0) {
      int copy_len = event->data_len;
      if (copy_len >= (int)sizeof(payload)) {
        copy_len = (int)sizeof(payload) - 1;
      }
      memcpy(payload, event->data, (size_t)copy_len);
      payload[copy_len] = '\0';
      log_mqtt_in(topic, payload, copy_len);
    } else {
      log_mqtt_in(topic, NULL, 0);
    }

    if (!is_mqtt_command_topic(topic)) {
      break;
    }
    if (strcmp(topic, MAC_LIST_GET_TOPIC) == 0) {
      if (!redis_queue_job(REDIS_JOB_LIST, NULL)) {
        char err[] = "{\"macs\":[],\"error\":\"redis busy\"}";
        publish_mac_list(err);
      }
    } else {
      handle_wakeup_topic(topic);
    }
    break;
  }
  default:
    ESP_LOGD(TAG, "mqtt event id=%ld", (long)event_id);
    break;
  }
}

void mqtt_manager_start(void) {
  config_load(&s_config);
  redis_cfg_from_url(s_config.redis_url, &s_redis);
  if (s_redis.enabled) {
    ESP_LOGI(TAG, "redis host=%s port=%u tls=%s user=%s", s_redis.host,
             s_redis.port, s_redis.use_tls ? "yes" : "no",
             s_redis.username[0] != '\0' ? s_redis.username : "(none)");
  } else {
    ESP_LOGI(TAG, "redis disabled");
  }
  ESP_LOGI(TAG, "mqtt uri=%s", s_config.mqtt_uri);

  esp_mqtt_client_config_t mqtt_cfg = {
      .broker.address.uri = s_config.mqtt_uri,
      .broker.verification.crt_bundle_attach = esp_crt_bundle_attach,
      .credentials.username = s_config.mqtt_user,
      .credentials.authentication.password = s_config.mqtt_pass,
  };
  char client_id[32];
  uint8_t mac[6];
  if (esp_read_mac(mac, ESP_MAC_WIFI_STA) == ESP_OK) {
    snprintf(client_id, sizeof(client_id), "esp32_%02x%02x%02x", mac[3], mac[4],
             mac[5]);
  } else {
    snprintf(client_id, sizeof(client_id), "wol_service");
  }
  mqtt_cfg.credentials.client_id = client_id;

  redis_worker_start();

  s_client = esp_mqtt_client_init(&mqtt_cfg);
  esp_mqtt_client_register_event(s_client, ESP_EVENT_ANY_ID, mqtt_event_handler,
                                 NULL);
  esp_mqtt_client_start(s_client);
  ESP_LOGI(TAG, "mqtt started (client_id=%s)", client_id);

  redis_queue_job(REDIS_JOB_SEED, NULL);
}

bool mqtt_manager_is_connected(void) { return s_connected; }

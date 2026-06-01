#include "wifi_manager.h"
#include "config.h"
#include "esp_event.h"
#include "esp_log.h"
#include "esp_netif.h"
#include "esp_wifi.h"
#include "freertos/FreeRTOS.h"
#include "freertos/event_groups.h"
#include "freertos/task.h"
#include <string.h>

static const char *TAG = "wifi";
static EventGroupHandle_t s_wifi_event_group;
#define WIFI_CONNECTED_BIT BIT0
static volatile bool s_connected = false;

static void wifi_event_handler(void *arg, esp_event_base_t base, int32_t id,
                               void *data) {
  if (base == WIFI_EVENT) {
    if (id == WIFI_EVENT_STA_START) {
      ESP_LOGI(TAG, "STA start, connecting...");
      esp_wifi_connect();
    } else if (id == WIFI_EVENT_STA_DISCONNECTED) {
      s_connected = false;
      xEventGroupClearBits(s_wifi_event_group, WIFI_CONNECTED_BIT);
      esp_wifi_connect();
      ESP_LOGI(TAG, "disconnected, reconnecting...");
    }
  } else if (base == IP_EVENT && id == IP_EVENT_STA_GOT_IP) {
    ip_event_got_ip_t *event = (ip_event_got_ip_t *)data;
    ESP_LOGI(TAG, "got ip: " IPSTR, IP2STR(&event->ip_info.ip));
    s_connected = true;
    xEventGroupSetBits(s_wifi_event_group, WIFI_CONNECTED_BIT);
  }
}

void wifi_manager_start(void) {
  s_wifi_event_group = xEventGroupCreate();
  esp_netif_create_default_wifi_sta();
  wifi_init_config_t cfg = WIFI_INIT_CONFIG_DEFAULT();
  esp_wifi_init(&cfg);
  esp_event_handler_instance_t instance_any, instance_got_ip;
  esp_event_handler_instance_register(WIFI_EVENT, ESP_EVENT_ANY_ID,
                                      &wifi_event_handler, NULL, &instance_any);
  esp_event_handler_instance_register(IP_EVENT, IP_EVENT_STA_GOT_IP,
                                      &wifi_event_handler, NULL,
                                      &instance_got_ip);

  app_config_t cfg_app;
  config_load(&cfg_app);

  wifi_config_t wifi_config = {0};
  strncpy((char *)wifi_config.sta.ssid, cfg_app.wifi_ssid,
          sizeof(wifi_config.sta.ssid) - 1);
  strncpy((char *)wifi_config.sta.password, cfg_app.wifi_pass,
          sizeof(wifi_config.sta.password) - 1);
  wifi_config.sta.threshold.authmode =
      (strlen(cfg_app.wifi_pass) > 0) ? WIFI_AUTH_WPA2_PSK : WIFI_AUTH_OPEN;
  esp_wifi_set_mode(WIFI_MODE_STA);
  esp_wifi_set_config(WIFI_IF_STA, &wifi_config);
  esp_wifi_start();
  ESP_LOGI(TAG, "wifi started ssid=%s", cfg_app.wifi_ssid);
}

bool wifi_manager_is_connected(void) { return s_connected; }

int32_t wifi_manager_get_rssi(void) {
  wifi_ap_record_t ap;
  if (esp_wifi_sta_get_ap_info(&ap) == ESP_OK)
    return ap.rssi;
  return 0;
}

void wifi_manager_wait_connected(void) {
  xEventGroupWaitBits(s_wifi_event_group, WIFI_CONNECTED_BIT, false, true,
                      portMAX_DELAY);
}

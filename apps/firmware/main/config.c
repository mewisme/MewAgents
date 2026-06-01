#include "config.h"
#include "esp_log.h"
#include "sdkconfig.h"
#include <string.h>

static const char *TAG = "config";

void config_load(app_config_t *out) {
  if (out == NULL)
    return;
  memset(out, 0, sizeof(app_config_t));

  strncpy(out->wifi_ssid, CONFIG_WIFI_SSID, CONFIG_WIFI_SSID_LEN - 1);
  strncpy(out->wifi_pass, CONFIG_WIFI_PASSWORD, CONFIG_WIFI_PASS_LEN - 1);
  strncpy(out->mqtt_uri, CONFIG_MQTT_URI, CONFIG_MQTT_URI_LEN - 1);
  strncpy(out->mqtt_user, CONFIG_MQTT_USERNAME, CONFIG_MQTT_USER_LEN - 1);
  strncpy(out->mqtt_pass, CONFIG_MQTT_PASSWORD, CONFIG_MQTT_PASS_LEN - 1);
  strncpy(out->target_mac, CONFIG_TARGET_MAC, CONFIG_MAC_STR_LEN - 1);
  out->wol_port = (uint16_t)CONFIG_WOL_UDP_PORT;
  strncpy(out->redis_url, CONFIG_REDIS_URL, CONFIG_REDIS_URL_LEN - 1);

  ESP_LOGI(TAG, "config firmware=%s", APP_FIRMWARE_VERSION);
  ESP_LOGI(TAG, "config wifi_ssid=%s", out->wifi_ssid);
  ESP_LOGI(TAG, "config target_mac=%s", out->target_mac);
  ESP_LOGI(TAG, "config wol_port=%u", out->wol_port);
  ESP_LOGI(TAG, "config redis=%s", out->redis_url[0] != '\0' ? "on" : "off");
  ESP_LOGI(TAG, "config mqtt_uri=%s", out->mqtt_uri);
}

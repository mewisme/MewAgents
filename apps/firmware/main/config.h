#ifndef CONFIG_H
#define CONFIG_H

#include <stdint.h>

#define CONFIG_WIFI_SSID_LEN 32
#define CONFIG_WIFI_PASS_LEN 64
#define CONFIG_MQTT_URI_LEN 128
#define CONFIG_MQTT_USER_LEN 64
#define CONFIG_MQTT_PASS_LEN 64
#define CONFIG_MAC_STR_LEN 18
#define CONFIG_REDIS_URL_LEN 256

#define APP_FIRMWARE_VERSION "1.0.0"

typedef struct {
  char wifi_ssid[CONFIG_WIFI_SSID_LEN];
  char wifi_pass[CONFIG_WIFI_PASS_LEN];
  char mqtt_uri[CONFIG_MQTT_URI_LEN];
  char mqtt_user[CONFIG_MQTT_USER_LEN];
  char mqtt_pass[CONFIG_MQTT_PASS_LEN];
  char target_mac[CONFIG_MAC_STR_LEN];
  uint16_t wol_port;
  char redis_url[CONFIG_REDIS_URL_LEN];
} app_config_t;

void config_load(app_config_t *out);

#endif /* CONFIG_H */

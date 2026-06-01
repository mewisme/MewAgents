#include "config.h"
#include "esp_event.h"
#include "esp_log.h"
#include "esp_netif.h"
#include "mqtt_manager.h"
#include "nvs_flash.h"
#include "wifi_manager.h"

static const char *TAG = "main";

void app_main(void) {
  ESP_LOGI(TAG, "WOL Service starting (v%s)", APP_FIRMWARE_VERSION);
  esp_err_t ret = nvs_flash_init();
  if (ret == ESP_ERR_NVS_NO_FREE_PAGES ||
      ret == ESP_ERR_NVS_NEW_VERSION_FOUND) {
    ESP_ERROR_CHECK(nvs_flash_erase());
    ret = nvs_flash_init();
  }
  ESP_ERROR_CHECK(ret);
  ESP_ERROR_CHECK(esp_netif_init());
  ESP_ERROR_CHECK(esp_event_loop_create_default());

  app_config_t cfg;
  config_load(&cfg);

  wifi_manager_start();
  wifi_manager_wait_connected();
  mqtt_manager_start();

  ESP_LOGI(TAG, "ready");
}

idf_component_register(
    SRCS
        "main.c"
        "wifi_manager.c"
        "mqtt_manager.c"
        "wol_sender.c"
        "redis_client.c"
        "config.c"
    INCLUDE_DIRS "."
    REQUIRES
        mqtt
        esp_wifi
        esp_netif
        esp_event
        nvs_flash
        lwip
        esp-tls
)

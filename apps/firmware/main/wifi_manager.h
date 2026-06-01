#ifndef WIFI_MANAGER_H
#define WIFI_MANAGER_H

#include <stdbool.h>
#include <stdint.h>

void wifi_manager_start(void);
bool wifi_manager_is_connected(void);
int32_t wifi_manager_get_rssi(void);
void wifi_manager_wait_connected(void);

#endif /* WIFI_MANAGER_H */

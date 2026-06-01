#ifndef MQTT_MANAGER_H
#define MQTT_MANAGER_H

#include <stdbool.h>

void mqtt_manager_start(void);
bool mqtt_manager_is_connected(void);

#endif /* MQTT_MANAGER_H */

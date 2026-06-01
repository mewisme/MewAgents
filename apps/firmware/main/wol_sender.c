#include "wol_sender.h"
#include "esp_log.h"
#include "lwip/err.h"
#include "lwip/netdb.h"
#include "lwip/sockets.h"
#include <ctype.h>
#include <stdio.h>
#include <string.h>


static const char *TAG = "wol";

bool wol_sender_parse_mac(const char *mac_str, uint8_t *mac_out) {
  if (mac_str == NULL || mac_out == NULL) {
    return false;
  }
  while (isspace((unsigned char)*mac_str)) {
    mac_str++;
  }

  int hex_count = 0;
  for (const char *p = mac_str; *p; p++) {
    if (isxdigit((unsigned char)*p)) {
      hex_count++;
    } else if (*p == ':' || *p == '-' || isspace((unsigned char)*p)) {
      continue;
    } else {
      return false;
    }
  }
  if (hex_count != 12) {
    return false;
  }

  for (int i = 0; i < 6; i++) {
    while (*mac_str == ':' || *mac_str == '-' ||
           isspace((unsigned char)*mac_str)) {
      mac_str++;
    }
    unsigned int byte = 0;
    if (sscanf(mac_str, "%2x", &byte) != 1 || byte > 255) {
      return false;
    }
    mac_out[i] = (uint8_t)byte;
    mac_str += 2;
  }
  while (*mac_str == ':' || *mac_str == '-' ||
         isspace((unsigned char)*mac_str)) {
    mac_str++;
  }
  return *mac_str == '\0';
}

void wol_sender_format_mac(const uint8_t *mac, char *buf, size_t buf_len) {
  if (mac == NULL || buf == NULL || buf_len < 18) {
    return;
  }
  snprintf(buf, buf_len, "%02X:%02X:%02X:%02X:%02X:%02X", mac[0], mac[1],
           mac[2], mac[3], mac[4], mac[5]);
}

bool wol_sender_send(const uint8_t *mac, const char *broadcast_ip,
                     uint16_t port) {
  if (mac == NULL || broadcast_ip == NULL) {
    return false;
  }
  int fd = socket(AF_INET, SOCK_DGRAM, 0);
  if (fd < 0) {
    ESP_LOGE(TAG, "socket failed");
    return false;
  }
  int enable = 1;
  if (setsockopt(fd, SOL_SOCKET, SO_BROADCAST, &enable, sizeof(enable)) != 0) {
    ESP_LOGE(TAG, "SO_BROADCAST failed");
    close(fd);
    return false;
  }
  struct sockaddr_in dest = {0};
  dest.sin_family = AF_INET;
  dest.sin_port = htons(port);
  if (inet_pton(AF_INET, broadcast_ip, &dest.sin_addr) != 1) {
    ESP_LOGE(TAG, "invalid broadcast ip");
    close(fd);
    return false;
  }
  uint8_t packet[102];
  memset(packet, 0xff, 6);
  for (int i = 0; i < 16; i++) {
    memcpy(packet + 6 + i * 6, mac, 6);
  }
  ssize_t sent = sendto(fd, packet, sizeof(packet), 0, (struct sockaddr *)&dest,
                        sizeof(dest));
  close(fd);
  if (sent != (ssize_t)sizeof(packet)) {
    ESP_LOGE(TAG, "sendto failed %d", (int)sent);
    return false;
  }
  ESP_LOGI(TAG, "magic packet sent to %s:%u", broadcast_ip, port);
  return true;
}

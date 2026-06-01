#ifndef WOL_SENDER_H
#define WOL_SENDER_H

#include <stdint.h>
#include <stdbool.h>
#include <stddef.h>

bool wol_sender_parse_mac(const char *mac_str, uint8_t *mac_out);
void wol_sender_format_mac(const uint8_t *mac, char *buf, size_t buf_len);
bool wol_sender_send(const uint8_t *mac, const char *broadcast_ip, uint16_t port);

#endif /* WOL_SENDER_H */

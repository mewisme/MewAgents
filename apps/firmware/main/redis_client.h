#ifndef REDIS_CLIENT_H
#define REDIS_CLIENT_H

#include <stdbool.h>
#include <stdint.h>

#define REDIS_URL_MAX 256
#define REDIS_HOST_MAX 128
#define REDIS_USER_MAX 64
#define REDIS_PASS_MAX 128
#define REDIS_MAC_RECENTS_MAX 32
#define REDIS_MAC_STR_LEN 18

typedef struct {
  char host[REDIS_HOST_MAX];
  uint16_t port;
  char username[REDIS_USER_MAX];
  char password[REDIS_PASS_MAX];
  bool use_tls;
  bool enabled;
} redis_cfg_t;

bool redis_cfg_from_url(const char *url, redis_cfg_t *out);
bool redis_mac_cache_push(const redis_cfg_t *cfg, const char *mac);
bool redis_mac_cache_list(const redis_cfg_t *cfg, char out[][REDIS_MAC_STR_LEN],
                          int max_count, int *out_count);

#endif /* REDIS_CLIENT_H */

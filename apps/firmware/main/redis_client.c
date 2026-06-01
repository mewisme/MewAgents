#include "redis_client.h"
#include "esp_crt_bundle.h"
#include "esp_log.h"
#include "esp_tls.h"
#include "lwip/netdb.h"
#include "lwip/sockets.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

static const char *TAG = "redis";

#define REDIS_MAC_LIST_KEY "mac:recents"
#define REDIS_MAC_LIST_MAX 20
#define REDIS_IO_TIMEOUT_MS 10000

static int s_sock = -1;
static esp_tls_t *s_tls = NULL;

static void redis_close(void) {
  if (s_tls != NULL) {
    esp_tls_conn_destroy(s_tls);
    s_tls = NULL;
  }
  if (s_sock >= 0) {
    close(s_sock);
    s_sock = -1;
  }
}

static ssize_t redis_read_bytes(void *buf, size_t len) {
  if (s_tls != NULL) {
    return esp_tls_conn_read(s_tls, buf, len);
  }
  if (s_sock >= 0) {
    return recv(s_sock, buf, len, 0);
  }
  return -1;
}

static ssize_t redis_write_bytes(const void *buf, size_t len) {
  if (s_tls != NULL) {
    return esp_tls_conn_write(s_tls, buf, len);
  }
  if (s_sock >= 0) {
    return send(s_sock, buf, len, 0);
  }
  return -1;
}

static bool redis_set_sock_timeout(int sock) {
  struct timeval tv = {
      .tv_sec = REDIS_IO_TIMEOUT_MS / 1000,
      .tv_usec = (REDIS_IO_TIMEOUT_MS % 1000) * 1000,
  };
  if (setsockopt(sock, SOL_SOCKET, SO_RCVTIMEO, &tv, sizeof(tv)) != 0) {
    return false;
  }
  if (setsockopt(sock, SOL_SOCKET, SO_SNDTIMEO, &tv, sizeof(tv)) != 0) {
    return false;
  }
  return true;
}

bool redis_cfg_from_url(const char *url, redis_cfg_t *out) {
  if (out == NULL) {
    return false;
  }
  memset(out, 0, sizeof(*out));
  if (url == NULL || url[0] == '\0') {
    return true;
  }

  const char *p = url;
  if (strncmp(p, "rediss://", 9) == 0) {
    out->use_tls = true;
    p += 9;
  } else if (strncmp(p, "redis://", 8) == 0) {
    p += 8;
  }

  char hostport[REDIS_HOST_MAX + 16];
  const char *at = strchr(p, '@');
  if (at != NULL) {
    size_t userinfo_len = (size_t)(at - p);
    if (userinfo_len >= REDIS_USER_MAX + REDIS_PASS_MAX) {
      return false;
    }
    char userinfo[REDIS_USER_MAX + REDIS_PASS_MAX];
    memcpy(userinfo, p, userinfo_len);
    userinfo[userinfo_len] = '\0';

    char *colon = strchr(userinfo, ':');
    if (colon != NULL) {
      *colon = '\0';
      strncpy(out->username, userinfo, sizeof(out->username) - 1);
      strncpy(out->password, colon + 1, sizeof(out->password) - 1);
    } else {
      strncpy(out->password, userinfo, sizeof(out->password) - 1);
    }
    strncpy(hostport, at + 1, sizeof(hostport) - 1);
  } else {
    strncpy(hostport, p, sizeof(hostport) - 1);
  }

  char *colon = strrchr(hostport, ':');
  if (colon != NULL && colon > hostport) {
    *colon = '\0';
    int port = atoi(colon + 1);
    out->port = (port > 0 && port <= 65535) ? (uint16_t)port : 6379;
  } else {
    out->port = 6379;
  }
  strncpy(out->host, hostport, sizeof(out->host) - 1);
  out->enabled = (out->host[0] != '\0');

  if (out->enabled && out->use_tls) {
    ESP_LOGI(TAG, "redis TLS enabled for %s:%u", out->host, out->port);
  }
  return true;
}

static bool redis_connect_plain(const redis_cfg_t *cfg, const char *port_str) {
  struct addrinfo hints = {
      .ai_family = AF_INET,
      .ai_socktype = SOCK_STREAM,
  };
  struct addrinfo *res = NULL;
  int err = getaddrinfo(cfg->host, port_str, &hints, &res);
  if (err != 0 || res == NULL) {
    ESP_LOGE(TAG, "getaddrinfo %s:%s failed", cfg->host, port_str);
    return false;
  }

  s_sock = socket(res->ai_family, res->ai_socktype, res->ai_protocol);
  if (s_sock < 0) {
    freeaddrinfo(res);
    return false;
  }
  redis_set_sock_timeout(s_sock);

  if (connect(s_sock, res->ai_addr, res->ai_addrlen) != 0) {
    ESP_LOGE(TAG, "connect %s:%s failed", cfg->host, port_str);
    redis_close();
    freeaddrinfo(res);
    return false;
  }
  freeaddrinfo(res);
  ESP_LOGI(TAG, "connected (tcp) %s:%s", cfg->host, port_str);
  return true;
}

static bool redis_connect_tls(const redis_cfg_t *cfg) {
  esp_tls_cfg_t tls_cfg = {
      .crt_bundle_attach = esp_crt_bundle_attach,
      .timeout_ms = REDIS_IO_TIMEOUT_MS,
  };
  s_tls = esp_tls_init();
  if (s_tls == NULL) {
    ESP_LOGE(TAG, "esp_tls_init failed");
    return false;
  }
  int ret = esp_tls_conn_new_sync(cfg->host, strlen(cfg->host), cfg->port,
                                  &tls_cfg, s_tls);
  if (ret != 1) {
    ESP_LOGE(TAG, "TLS connect %s:%u failed (%d)", cfg->host, cfg->port, ret);
    redis_close();
    return false;
  }
  ESP_LOGI(TAG, "connected (tls) %s:%u", cfg->host, cfg->port);
  return true;
}

static bool redis_connect(const redis_cfg_t *cfg) {
  if (cfg == NULL || !cfg->enabled) {
    return false;
  }
  redis_close();

  if (cfg->use_tls) {
    return redis_connect_tls(cfg);
  }

  char port_str[8];
  snprintf(port_str, sizeof(port_str), "%u", cfg->port);
  return redis_connect_plain(cfg, port_str);
}

static bool redis_write_all(const char *data, size_t len) {
  size_t sent = 0;
  while (sent < len) {
    ssize_t n = redis_write_bytes(data + sent, len - sent);
    if (n <= 0) {
      ESP_LOGW(TAG, "redis write failed at %u/%u", (unsigned)sent,
               (unsigned)len);
      return false;
    }
    sent += (size_t)n;
  }
  return true;
}

static int redis_read_line(char *buf, size_t buf_len) {
  size_t pos = 0;
  while (pos + 1 < buf_len) {
    char c;
    ssize_t n = redis_read_bytes(&c, 1);
    if (n <= 0) {
      ESP_LOGW(TAG, "redis read byte failed (pos=%u)", (unsigned)pos);
      return -1;
    }
    buf[pos++] = c;
    if (pos >= 2 && buf[pos - 2] == '\r' && buf[pos - 1] == '\n') {
      buf[pos] = '\0';
      ESP_LOGI(TAG, "redis << %s", buf);
      return (int)pos;
    }
  }
  ESP_LOGW(TAG, "redis read line overflow");
  return -1;
}

static bool redis_read_bulk(char *buf, size_t buf_len, int bulk_len) {
  if (bulk_len < 0 || (size_t)bulk_len + 2 > buf_len) {
    return false;
  }
  size_t need = (size_t)bulk_len + 2;
  size_t got = 0;
  while (got < need) {
    ssize_t n = redis_read_bytes(buf + got, need - got);
    if (n <= 0) {
      return false;
    }
    got += (size_t)n;
  }
  buf[bulk_len] = '\0';
  return true;
}

static bool redis_line_ok(const char *line) {
  return line[0] == '+' && strstr(line, "OK") != NULL;
}

static bool redis_expect_ok(void) {
  char line[128];
  if (redis_read_line(line, sizeof(line)) < 0) {
    ESP_LOGW(TAG, "redis response missing");
    return false;
  }
  if (!redis_line_ok(line)) {
    ESP_LOGW(TAG, "redis unexpected response");
    return false;
  }
  return true;
}

static bool redis_auth(const redis_cfg_t *cfg) {
  bool has_user = cfg->username[0] != '\0';
  bool has_pass = cfg->password[0] != '\0';
  if (!has_pass) {
    ESP_LOGI(TAG, "redis AUTH skipped (no password)");
    return true;
  }

  char cmd[512];
  int n;
  if (has_user) {
    ESP_LOGI(TAG, "redis AUTH user=%s", cfg->username);
    n = snprintf(cmd, sizeof(cmd),
                 "*3\r\n$4\r\nAUTH\r\n$%zu\r\n%s\r\n$%zu\r\n%s\r\n",
                 strlen(cfg->username), cfg->username, strlen(cfg->password),
                 cfg->password);
  } else {
    ESP_LOGI(TAG, "redis AUTH (password only)");
    n = snprintf(cmd, sizeof(cmd), "*2\r\n$4\r\nAUTH\r\n$%zu\r\n%s\r\n",
                 strlen(cfg->password), cfg->password);
  }
  if (n < 0 || (size_t)n >= sizeof(cmd)) {
    return false;
  }
  if (!redis_write_all(cmd, (size_t)n)) {
    ESP_LOGW(TAG, "redis AUTH write failed");
    return false;
  }
  if (!redis_expect_ok()) {
    ESP_LOGW(TAG, "redis AUTH failed");
    return false;
  }
  ESP_LOGI(TAG, "redis AUTH ok");
  return true;
}

static bool redis_exec_status(const char *cmd, size_t cmd_len) {
  if (!redis_write_all(cmd, cmd_len)) {
    ESP_LOGW(TAG, "redis cmd write failed");
    return false;
  }
  char line[128];
  if (redis_read_line(line, sizeof(line)) < 0) {
    ESP_LOGW(TAG, "redis cmd response missing");
    return false;
  }
  bool ok = line[0] == '+' || line[0] == ':';
  if (!ok) {
    ESP_LOGW(TAG, "redis cmd error: %s", line);
  }
  return ok;
}

static int redis_append_bulk(char *dst, size_t dst_len, size_t off,
                             const char *s) {
  int n = snprintf(dst + off, dst_len - off, "$%zu\r\n%s\r\n", strlen(s), s);
  return (n > 0) ? n : 0;
}

static bool redis_cmd_lrem_lpush_ltrim(const char *list_key, const char *mac,
                                       int max_items) {
  char cmd[512];
  size_t off = 0;
  off += (size_t)snprintf(cmd + off, sizeof(cmd) - off, "*4\r\n");
  off += (size_t)redis_append_bulk(cmd, sizeof(cmd), off, "LREM");
  off += (size_t)redis_append_bulk(cmd, sizeof(cmd), off, list_key);
  off += (size_t)snprintf(cmd + off, sizeof(cmd) - off, "$1\r\n0\r\n");
  off += (size_t)redis_append_bulk(cmd, sizeof(cmd), off, mac);
  if (!redis_exec_status(cmd, off)) {
    return false;
  }

  off = 0;
  off += (size_t)snprintf(cmd + off, sizeof(cmd) - off, "*3\r\n");
  off += (size_t)redis_append_bulk(cmd, sizeof(cmd), off, "LPUSH");
  off += (size_t)redis_append_bulk(cmd, sizeof(cmd), off, list_key);
  off += (size_t)redis_append_bulk(cmd, sizeof(cmd), off, mac);
  if (!redis_exec_status(cmd, off)) {
    return false;
  }

  off = 0;
  off += (size_t)snprintf(cmd + off, sizeof(cmd) - off, "*4\r\n");
  off += (size_t)redis_append_bulk(cmd, sizeof(cmd), off, "LTRIM");
  off += (size_t)redis_append_bulk(cmd, sizeof(cmd), off, list_key);
  off += (size_t)snprintf(cmd + off, sizeof(cmd) - off, "$1\r\n0\r\n");
  char end_idx[16];
  snprintf(end_idx, sizeof(end_idx), "%d", max_items > 0 ? max_items - 1 : 0);
  off += (size_t)redis_append_bulk(cmd, sizeof(cmd), off, end_idx);
  return redis_exec_status(cmd, off);
}

static bool redis_cmd_lrange(const char *list_key,
                             char out[][REDIS_MAC_STR_LEN], int max_count,
                             int *out_count) {
  char cmd[256];
  size_t off = 0;
  off += (size_t)snprintf(cmd + off, sizeof(cmd) - off, "*4\r\n");
  off += (size_t)redis_append_bulk(cmd, sizeof(cmd), off, "LRANGE");
  off += (size_t)redis_append_bulk(cmd, sizeof(cmd), off, list_key);
  off += (size_t)redis_append_bulk(cmd, sizeof(cmd), off, "0");
  off += (size_t)redis_append_bulk(cmd, sizeof(cmd), off, "-1");
  if (!redis_write_all(cmd, off)) {
    return false;
  }

  char line[64];
  if (redis_read_line(line, sizeof(line)) < 0 || line[0] != '*') {
    return false;
  }
  int count = atoi(line + 1);
  if (count < 0) {
    return false;
  }
  *out_count = 0;
  for (int i = 0; i < count && *out_count < max_count; i++) {
    if (redis_read_line(line, sizeof(line)) < 0 || line[0] != '$') {
      return false;
    }
    int bulk_len = atoi(line + 1);
    if (bulk_len < 0) {
      continue;
    }
    char bulk[REDIS_MAC_STR_LEN + 4];
    if (!redis_read_bulk(bulk, sizeof(bulk), bulk_len)) {
      return false;
    }
    strncpy(out[*out_count], bulk, REDIS_MAC_STR_LEN - 1);
    out[*out_count][REDIS_MAC_STR_LEN - 1] = '\0';
    (*out_count)++;
  }
  return true;
}

bool redis_mac_cache_push(const redis_cfg_t *cfg, const char *mac) {
  if (cfg == NULL || !cfg->enabled || mac == NULL || mac[0] == '\0') {
    return false;
  }
  ESP_LOGI(TAG, "LPUSH %s -> %s", mac, REDIS_MAC_LIST_KEY);
  if (!redis_connect(cfg)) {
    ESP_LOGW(TAG, "redis connect failed (push)");
    return false;
  }
  bool ok = redis_auth(cfg) && redis_cmd_lrem_lpush_ltrim(
                                   REDIS_MAC_LIST_KEY, mac, REDIS_MAC_LIST_MAX);
  redis_close();
  ESP_LOGI(TAG, "redis push %s", ok ? "ok" : "failed");
  return ok;
}

bool redis_mac_cache_list(const redis_cfg_t *cfg, char out[][REDIS_MAC_STR_LEN],
                          int max_count, int *out_count) {
  if (out_count == NULL) {
    return false;
  }
  *out_count = 0;
  if (cfg == NULL || !cfg->enabled || out == NULL || max_count <= 0) {
    return false;
  }
  ESP_LOGI(TAG, "LRANGE %s", REDIS_MAC_LIST_KEY);
  if (!redis_connect(cfg)) {
    ESP_LOGW(TAG, "redis connect failed (list)");
    return false;
  }
  bool ok = redis_auth(cfg) &&
            redis_cmd_lrange(REDIS_MAC_LIST_KEY, out, max_count, out_count);
  redis_close();
  ESP_LOGI(TAG, "redis list %s count=%d", ok ? "ok" : "failed",
           ok ? *out_count : 0);
  return ok;
}

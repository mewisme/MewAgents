package mqtt

import (
	"crypto/tls"
	"fmt"
	"net/url"
	"strings"
)

var supportedSchemes = map[string]struct{}{
	"mqtt":  {},
	"mqtts": {},
}

// ParseBrokerURL validates and parses an MQTT broker URL.
func ParseBrokerURL(raw string) (*url.URL, *tls.Config, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return nil, nil, fmt.Errorf("mqtt url is required")
	}

	u, err := url.Parse(raw)
	if err != nil {
		return nil, nil, fmt.Errorf("parse mqtt url: %w", err)
	}
	if u.Scheme == "" || u.Host == "" {
		return nil, nil, fmt.Errorf("mqtt url must include scheme and host")
	}
	if _, ok := supportedSchemes[strings.ToLower(u.Scheme)]; !ok {
		return nil, nil, fmt.Errorf("unsupported mqtt url scheme %q; supported: mqtt, mqtts", u.Scheme)
	}

	var tlsCfg *tls.Config
	if strings.EqualFold(u.Scheme, "mqtts") {
		tlsCfg = &tls.Config{
			MinVersion: tls.VersionTLS12,
		}
	}

	return u, tlsCfg, nil
}

// RedactedURL returns a broker URL safe for logging.
func RedactedURL(raw string) string {
	u, _, err := ParseBrokerURL(raw)
	if err != nil {
		return "<invalid>"
	}
	u.User = nil
	return u.String()
}

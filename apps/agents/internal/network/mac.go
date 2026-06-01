package network

import (
	"context"
	"fmt"
	"net"
	"strings"
)

// Collector detects active network interface MAC addresses.
type Collector interface {
	ActiveMACs(ctx context.Context) ([]string, error)
}

// DefaultCollector implements MAC address collection from active interfaces.
type DefaultCollector struct{}

// NewCollector creates a default MAC address collector.
func NewCollector() *DefaultCollector {
	return &DefaultCollector{}
}

// ActiveMACs returns normalized MAC addresses for active non-loopback interfaces.
func (c *DefaultCollector) ActiveMACs(ctx context.Context) ([]string, error) {
	if err := ctx.Err(); err != nil {
		return nil, err
	}

	ifaces, err := net.Interfaces()
	if err != nil {
		return nil, fmt.Errorf("list network interfaces: %w", err)
	}

	seen := make(map[string]struct{})
	macs := make([]string, 0)

	for _, iface := range ifaces {
		if err := ctx.Err(); err != nil {
			return nil, err
		}
		if !isActiveInterface(iface) {
			continue
		}

		mac, ok := NormalizeMAC(iface.HardwareAddr.String())
		if !ok {
			continue
		}
		if _, exists := seen[mac]; exists {
			continue
		}
		seen[mac] = struct{}{}
		macs = append(macs, mac)
	}

	if len(macs) == 0 {
		return nil, fmt.Errorf("no active network interfaces with valid MAC addresses found")
	}
	return macs, nil
}

func isActiveInterface(iface net.Interface) bool {
	if iface.Flags&net.FlagUp == 0 {
		return false
	}
	if iface.Flags&net.FlagLoopback != 0 {
		return false
	}
	if len(iface.HardwareAddr) == 0 {
		return false
	}
	return true
}

// NormalizeMAC converts a MAC address to uppercase hex without separators.
func NormalizeMAC(raw string) (string, bool) {
	clean := strings.ToUpper(raw)
	clean = strings.NewReplacer(":", "", "-", "", ".", "").Replace(clean)
	if len(clean) != 12 {
		return "", false
	}
	for _, r := range clean {
		if (r < '0' || r > '9') && (r < 'A' || r > 'F') {
			return "", false
		}
	}
	return clean, true
}

// ValidMAC reports whether s is a normalized MAC address.
func ValidMAC(s string) bool {
	_, ok := NormalizeMAC(s)
	return ok
}

// FormatMACColon returns AA:BB:CC:DD:EE:FF for a normalized MAC.
func FormatMACColon(normalized string) (string, bool) {
	mac, ok := NormalizeMAC(normalized)
	if !ok {
		return "", false
	}
	var b strings.Builder
	for i := 0; i < 6; i++ {
		if i > 0 {
			b.WriteByte(':')
		}
		b.WriteString(mac[i*2 : i*2+2])
	}
	return b.String(), true
}

// FormatMACHyphen returns AA-BB-CC-DD-EE-FF for a normalized MAC.
func FormatMACHyphen(normalized string) (string, bool) {
	colon, ok := FormatMACColon(normalized)
	if !ok {
		return "", false
	}
	return strings.ReplaceAll(colon, ":", "-"), true
}

// MACTopicVariants returns MAC strings for MQTT topic segments: plain, colon, hyphen.
func MACTopicVariants(normalized string) []string {
	mac, ok := NormalizeMAC(normalized)
	if !ok {
		return nil
	}
	colon, ok := FormatMACColon(mac)
	if !ok {
		return []string{mac}
	}
	hyphen, ok := FormatMACHyphen(mac)
	if !ok {
		return []string{mac, colon}
	}
	return []string{mac, colon, hyphen}
}

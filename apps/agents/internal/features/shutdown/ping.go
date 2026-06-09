package shutdown

import (
	"fmt"
	"strings"

	"github.com/mewisme/MewAgents/apps/agents/internal/network"
)

func parsePingTopic(topic string) (normalizedMAC string, isOK bool, ok bool) {
	topic = strings.TrimSpace(topic)
	if !strings.HasPrefix(topic, "ping/") {
		return "", false, false
	}

	rest := strings.TrimPrefix(topic, "ping/")
	if rest == "" {
		return "", false, false
	}

	if strings.HasSuffix(rest, "/ok") {
		macPart := strings.TrimSuffix(rest, "/ok")
		if macPart == "" || strings.Contains(macPart, "/") {
			return "", false, false
		}
		normalizedMAC, ok = network.NormalizeMAC(macPart)
		return normalizedMAC, true, ok
	}

	if strings.Contains(rest, "/") {
		return "", false, false
	}

	normalizedMAC, ok = network.NormalizeMAC(rest)
	return normalizedMAC, false, ok
}

func pingOKTopic(normalizedMAC string) string {
	return fmt.Sprintf("ping/%s/ok", normalizedMAC)
}

func pingResultPayload(normalizedMAC string) []byte {
	colon, ok := network.FormatMACColon(normalizedMAC)
	if !ok {
		return []byte(normalizedMAC)
	}
	return []byte(colon)
}

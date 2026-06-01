package mqtt

import "strings"

func isMQTTAuthError(err error) bool {
	if err == nil {
		return false
	}
	msg := strings.ToLower(err.Error())
	return strings.Contains(msg, "not authorized") ||
		strings.Contains(msg, "reason: 135") ||
		strings.Contains(msg, "wrong authentication secret") ||
		strings.Contains(msg, "unknown authentication key")
}

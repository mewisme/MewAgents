package shutdown

import (
	"log/slog"
	"strings"

	"mewagents/internal/network"
)

type messageHandler struct {
	logger   *slog.Logger
	store    *pendingStore
	macs     map[string]struct{}
	shutdown func() error
}

func newMessageHandler(logger *slog.Logger, store *pendingStore, macs []string, shutdownFn func() error) *messageHandler {
	macSet := make(map[string]struct{}, len(macs))
	for _, mac := range macs {
		normalized, ok := network.NormalizeMAC(mac)
		if !ok {
			continue
		}
		macSet[normalized] = struct{}{}
	}
	return &messageHandler{
		logger:   logger,
		store:    store,
		macs:     macSet,
		shutdown: shutdownFn,
	}
}

func (h *messageHandler) handleTopic(topic string) {
	mac, isConfirm, ok := parseShutdownTopic(topic)
	if !ok {
		return
	}

	if isConfirm {
		h.handleConfirm(mac)
		return
	}
	h.handleRequest(mac)
}

func parseShutdownTopic(topic string) (normalizedMAC string, isConfirm bool, ok bool) {
	topic = strings.TrimSpace(topic)
	if !strings.HasPrefix(topic, "shutdown/") {
		return "", false, false
	}

	rest := strings.TrimPrefix(topic, "shutdown/")
	if rest == "" {
		return "", false, false
	}
	if strings.Count(rest, "/") > 1 || (strings.Contains(rest, "/") && !strings.HasSuffix(rest, "/confirm")) {
		return "", false, false
	}

	isConfirm = strings.HasSuffix(rest, "/confirm")
	if isConfirm {
		rest = strings.TrimSuffix(rest, "/confirm")
		if rest == "" {
			return "", false, false
		}
	}

	normalizedMAC, ok = network.NormalizeMAC(rest)
	if !ok {
		return "", false, false
	}
	return normalizedMAC, isConfirm, true
}

func (h *messageHandler) handleRequest(mac string) {
	if !h.isKnownMAC(mac) {
		h.logger.Warn("ignored shutdown request for unknown mac", "mac", mac)
		return
	}

	req := h.store.create(mac)
	h.logger.Info("shutdown request pending",
		"mac", mac,
		"expires_at", req.expiresAt.UTC().Format(timeRFC3339),
	)
}

func (h *messageHandler) handleConfirm(mac string) {
	if !h.isKnownMAC(mac) {
		h.logger.Warn("ignored shutdown confirmation for unknown mac", "mac", mac)
		return
	}

	result, req := h.store.confirm(mac)
	switch result {
	case confirmMissing:
		h.logger.Info("ignored shutdown confirmation without pending request", "mac", mac)
	case confirmExpired:
		h.logger.Info("ignored expired shutdown confirmation", "mac", mac, "expired_at", req.expiresAt.UTC().Format(timeRFC3339))
	case confirmExecuted:
		h.logger.Info("shutdown confirmation accepted", "mac", mac)
		if err := h.shutdown(); err != nil {
			h.logger.Error("shutdown command failed", "mac", mac, "error", err)
		}
	}
}

func (h *messageHandler) isKnownMAC(mac string) bool {
	normalized, ok := network.NormalizeMAC(mac)
	if !ok {
		return false
	}
	_, exists := h.macs[normalized]
	return exists
}

const timeRFC3339 = "2006-01-02T15:04:05Z07:00"

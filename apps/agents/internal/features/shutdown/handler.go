package shutdown

import (
	"log/slog"
	"strings"

	"github.com/mewisme/MewAgents/apps/agents/internal/network"
)

type topicAction int

const (
	topicActionRequest topicAction = iota
	topicActionConfirm
	topicActionCancel
)

type messageHandler struct {
	logger      *slog.Logger
	store       *pendingStore
	macs        map[string]struct{}
	shutdown    func() error
	publishPing func(normalizedMAC string) error
}

func newMessageHandler(logger *slog.Logger, store *pendingStore, macs []string, shutdownFn func() error, publishPingFn func(normalizedMAC string) error) *messageHandler {
	macSet := make(map[string]struct{}, len(macs))
	for _, mac := range macs {
		normalized, ok := network.NormalizeMAC(mac)
		if !ok {
			continue
		}
		macSet[normalized] = struct{}{}
	}
	return &messageHandler{
		logger:      logger,
		store:       store,
		macs:        macSet,
		shutdown:    shutdownFn,
		publishPing: publishPingFn,
	}
}

func (h *messageHandler) handleTopic(topic string) {
	if mac, isOK, ok := parsePingTopic(topic); ok {
		if !isOK {
			h.handlePing(mac)
		}
		return
	}

	mac, action, ok := parseShutdownTopic(topic)
	if !ok {
		return
	}

	switch action {
	case topicActionConfirm:
		h.handleConfirm(mac)
	case topicActionCancel:
		h.handleCancel(mac)
	default:
		h.handleRequest(mac)
	}
}

func parseShutdownTopic(topic string) (normalizedMAC string, action topicAction, ok bool) {
	topic = strings.TrimSpace(topic)
	if !strings.HasPrefix(topic, "shutdown/") {
		return "", 0, false
	}

	rest := strings.TrimPrefix(topic, "shutdown/")
	if rest == "" {
		return "", 0, false
	}

	action = topicActionRequest
	if strings.Contains(rest, "/") {
		switch {
		case strings.HasSuffix(rest, "/confirm"):
			action = topicActionConfirm
			rest = strings.TrimSuffix(rest, "/confirm")
		case strings.HasSuffix(rest, "/cancel"):
			action = topicActionCancel
			rest = strings.TrimSuffix(rest, "/cancel")
		default:
			return "", 0, false
		}
		if rest == "" {
			return "", 0, false
		}
	}

	normalizedMAC, ok = network.NormalizeMAC(rest)
	if !ok {
		return "", 0, false
	}
	return normalizedMAC, action, true
}

func (h *messageHandler) handlePing(mac string) {
	if !h.isKnownMAC(mac) {
		h.logger.Warn("ignored ping for unknown mac", "mac", mac)
		return
	}
	if h.publishPing == nil {
		h.logger.Warn("ignored ping without publisher", "mac", mac)
		return
	}
	if err := h.publishPing(mac); err != nil {
		h.logger.Error("ping ok publish failed", "mac", mac, "error", err)
		return
	}
	h.logger.Info("ping ok published", "mac", mac, "topic", pingOKTopic(mac))
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

func (h *messageHandler) handleCancel(mac string) {
	if !h.isKnownMAC(mac) {
		h.logger.Warn("ignored shutdown cancel for unknown mac", "mac", mac)
		return
	}

	result, req := h.store.cancel(mac)
	switch result {
	case cancelMissing:
		h.logger.Info("ignored shutdown cancel without pending request", "mac", mac)
	case cancelRemoved:
		h.logger.Info("shutdown request cancelled", "mac", mac, "was_expires_at", req.expiresAt.UTC().Format(timeRFC3339))
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

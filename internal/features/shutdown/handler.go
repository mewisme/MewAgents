package shutdown

import (
	"fmt"
	"log/slog"
	"regexp"
	"strings"

	"mewagents/internal/network"
)

var (
	requestTopicPattern = regexp.MustCompile(`^shutdown/([0-9A-F]{12})$`)
	confirmTopicPattern = regexp.MustCompile(`^shutdown/([0-9A-F]{12})/confirm$`)
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
		macSet[mac] = struct{}{}
	}
	return &messageHandler{
		logger:   logger,
		store:    store,
		macs:     macSet,
		shutdown: shutdownFn,
	}
}

func (h *messageHandler) handleTopic(topic string) {
	topic = strings.TrimSpace(topic)
	if topic == "" {
		return
	}

	if matches := confirmTopicPattern.FindStringSubmatch(topic); len(matches) == 2 {
		h.handleConfirm(matches[1])
		return
	}

	if matches := requestTopicPattern.FindStringSubmatch(topic); len(matches) == 2 {
		h.handleRequest(matches[1])
	}
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

func topicForRequest(mac string) string {
	return fmt.Sprintf("shutdown/%s", mac)
}

func topicForConfirm(mac string) string {
	return fmt.Sprintf("shutdown/%s/confirm", mac)
}

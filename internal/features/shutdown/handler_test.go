package shutdown_test

import (
	"errors"
	"io"
	"log/slog"
	"testing"
	"time"

	. "mewagents/internal/features/shutdown"
)

func TestMessageHandlerTwoStepFlow(t *testing.T) {
	store := NewPendingStoreForTest(time.Minute, time.Now)
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))

	shutdownCalled := false
	handler := NewMessageHandlerForTest(logger, store, []string{"AABBCCDDEEFF"}, func() error {
		shutdownCalled = true
		return nil
	})

	handler.HandleTopic("shutdown/AABBCCDDEEFF")
	if shutdownCalled {
		t.Fatal("shutdown should not run on request only")
	}

	handler.HandleTopic("shutdown/AABBCCDDEEFF/confirm")
	if !shutdownCalled {
		t.Fatal("expected shutdown after valid confirmation")
	}
}

func TestMessageHandlerConfirmWithoutPending(t *testing.T) {
	store := NewPendingStoreForTest(time.Minute, time.Now)
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))

	handler := NewMessageHandlerForTest(logger, store, []string{"AABBCCDDEEFF"}, func() error {
		return errors.New("should not shutdown")
	})

	handler.HandleTopic("shutdown/AABBCCDDEEFF/confirm")
}

func TestMessageHandlerExpiredConfirm(t *testing.T) {
	now := time.Unix(300, 0)
	store := NewPendingStoreForTest(time.Minute, func() time.Time { return now })
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))

	shutdownCalled := false
	handler := NewMessageHandlerForTest(logger, store, []string{"AABBCCDDEEFF"}, func() error {
		shutdownCalled = true
		return nil
	})

	handler.HandleTopic("shutdown/AABBCCDDEEFF")
	now = now.Add(2 * time.Minute)
	handler.HandleTopic("shutdown/AABBCCDDEEFF/confirm")

	if shutdownCalled {
		t.Fatal("expected expired confirmation to be ignored")
	}
}

func TestMessageHandlerUnknownMAC(t *testing.T) {
	store := NewPendingStoreForTest(time.Minute, time.Now)
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))

	shutdownCalled := false
	handler := NewMessageHandlerForTest(logger, store, []string{"AABBCCDDEEFF"}, func() error {
		shutdownCalled = true
		return nil
	})

	handler.HandleTopic("shutdown/001122334455")
	handler.HandleTopic("shutdown/001122334455/confirm")

	if shutdownCalled {
		t.Fatal("expected unknown mac messages to be ignored")
	}
}

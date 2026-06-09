package shutdown_test

import (
	"sync"
	"testing"
	"time"

	. "github.com/mewisme/MewAgents/apps/agents/internal/features/shutdown"
)

func TestPendingStoreConfirmFlow(t *testing.T) {
	store := NewPendingStoreForTest(time.Minute, func() time.Time {
		return time.Unix(100, 0)
	})

	req := store.Create("AABBCCDDEEFF")
	if req.MAC != "AABBCCDDEEFF" {
		t.Fatalf("unexpected mac: %q", req.MAC)
	}

	result, _ := store.Confirm("AABBCCDDEEFF")
	if result != ConfirmExecuted {
		t.Fatalf("expected executed confirm, got %v", result)
	}

	result, _ = store.Confirm("AABBCCDDEEFF")
	if result != ConfirmMissing {
		t.Fatalf("expected missing confirm, got %v", result)
	}
}

func TestPendingStoreExpiredConfirm(t *testing.T) {
	now := time.Unix(200, 0)
	store := NewPendingStoreForTest(time.Minute, func() time.Time {
		return now
	})

	store.Create("AABBCCDDEEFF")
	now = now.Add(2 * time.Minute)

	result, _ := store.Confirm("AABBCCDDEEFF")
	if result != ConfirmExpired {
		t.Fatalf("expected expired confirm, got %v", result)
	}

	result, _ = store.Confirm("AABBCCDDEEFF")
	if result != ConfirmMissing {
		t.Fatalf("expected missing confirm after expiry, got %v", result)
	}
}

func TestPendingStoreCancel(t *testing.T) {
	store := NewPendingStoreForTest(time.Minute, time.Now)

	store.Create("AABBCCDDEEFF")

	result, _ := store.Cancel("AABBCCDDEEFF")
	if result != CancelRemoved {
		t.Fatalf("expected cancel removed, got %v", result)
	}

	result, _ = store.Cancel("AABBCCDDEEFF")
	if result != CancelMissing {
		t.Fatalf("expected cancel missing, got %v", result)
	}

	confirmResult, _ := store.Confirm("AABBCCDDEEFF")
	if confirmResult != ConfirmMissing {
		t.Fatalf("expected confirm missing after cancel, got %v", confirmResult)
	}
}

func TestPendingStoreConcurrentAccess(t *testing.T) {
	store := NewPendingStoreForTest(time.Minute, time.Now)
	var wg sync.WaitGroup

	for i := 0; i < 50; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			store.Create("AABBCCDDEEFF")
			store.Confirm("AABBCCDDEEFF")
			store.Sweep()
		}()
	}

	wg.Wait()
}

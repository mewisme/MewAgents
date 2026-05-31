package shutdown

import "time"

// ConfirmResult describes the outcome of a shutdown confirmation attempt.
type ConfirmResult = confirmResult

const (
	ConfirmExecuted = confirmExecuted
	ConfirmMissing  = confirmMissing
	ConfirmExpired  = confirmExpired
)

// PendingRequest exposes pending request metadata for tests.
type PendingRequest struct {
	MAC       string
	CreatedAt time.Time
	ExpiresAt time.Time
}

// PendingStoreTest wraps the in-memory pending store for tests.
type PendingStoreTest struct {
	store *pendingStore
}

// NewPendingStoreForTest creates a pending store with a fixed clock function.
func NewPendingStoreForTest(ttl time.Duration, now func() time.Time) *PendingStoreTest {
	store := newPendingStore(ttl)
	store.now = now
	return &PendingStoreTest{store: store}
}

func (s *PendingStoreTest) Create(mac string) PendingRequest {
	req := s.store.create(mac)
	return PendingRequest{
		MAC:       req.mac,
		CreatedAt: req.createdAt,
		ExpiresAt: req.expiresAt,
	}
}

func (s *PendingStoreTest) Confirm(mac string) (ConfirmResult, PendingRequest) {
	result, req := s.store.confirm(mac)
	return result, PendingRequest{
		MAC:       req.mac,
		CreatedAt: req.createdAt,
		ExpiresAt: req.expiresAt,
	}
}

func (s *PendingStoreTest) Sweep() int {
	return s.store.sweep()
}

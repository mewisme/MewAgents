package shutdown

import (
	"sync"
	"time"
)

const defaultPendingTTL = time.Minute

type pendingRequest struct {
	mac       string
	createdAt time.Time
	expiresAt time.Time
}

type pendingStore struct {
	mu       sync.Mutex
	requests map[string]pendingRequest
	ttl      time.Duration
	now      func() time.Time
}

func newPendingStore(ttl time.Duration) *pendingStore {
	if ttl <= 0 {
		ttl = defaultPendingTTL
	}
	return &pendingStore{
		requests: make(map[string]pendingRequest),
		ttl:      ttl,
		now:      time.Now,
	}
}

func (s *pendingStore) create(mac string) pendingRequest {
	s.mu.Lock()
	defer s.mu.Unlock()

	now := s.now()
	req := pendingRequest{
		mac:       mac,
		createdAt: now,
		expiresAt: now.Add(s.ttl),
	}
	s.requests[mac] = req
	return req
}

type confirmResult int

const (
	confirmExecuted confirmResult = iota
	confirmMissing
	confirmExpired
)

func (s *pendingStore) confirm(mac string) (confirmResult, pendingRequest) {
	s.mu.Lock()
	defer s.mu.Unlock()

	req, ok := s.requests[mac]
	if !ok {
		return confirmMissing, pendingRequest{}
	}

	now := s.now()
	if now.After(req.expiresAt) {
		delete(s.requests, mac)
		return confirmExpired, req
	}

	delete(s.requests, mac)
	return confirmExecuted, req
}

type cancelResult int

const (
	cancelRemoved cancelResult = iota
	cancelMissing
)

func (s *pendingStore) cancel(mac string) (cancelResult, pendingRequest) {
	s.mu.Lock()
	defer s.mu.Unlock()

	req, ok := s.requests[mac]
	if !ok {
		return cancelMissing, pendingRequest{}
	}
	delete(s.requests, mac)
	return cancelRemoved, req
}

func (s *pendingStore) sweep() int {
	s.mu.Lock()
	defer s.mu.Unlock()

	now := s.now()
	removed := 0
	for mac, req := range s.requests {
		if now.After(req.expiresAt) {
			delete(s.requests, mac)
			removed++
		}
	}
	return removed
}

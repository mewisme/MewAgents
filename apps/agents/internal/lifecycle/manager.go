package lifecycle

import (
	"context"
	"os"
	"os/signal"
	"sync"
	"syscall"
)

// Manager coordinates graceful shutdown and background work.
type Manager interface {
	Run(ctx context.Context, fn func(context.Context) error)
	Wait() error
	NotifyContext(parent context.Context) (context.Context, context.CancelFunc)
}

// Default implements lifecycle management with a WaitGroup.
type Default struct {
	mu    sync.Mutex
	wg    sync.WaitGroup
	errMu sync.Mutex
	err   error
}

// New creates a lifecycle manager.
func New() *Default {
	return &Default{}
}

// Run executes fn in a goroutine and tracks it for Wait.
func (m *Default) Run(ctx context.Context, fn func(context.Context) error) {
	m.wg.Add(1)
	go func() {
		defer m.wg.Done()
		if err := fn(ctx); err != nil {
			m.errMu.Lock()
			if m.err == nil {
				m.err = err
			}
			m.errMu.Unlock()
		}
	}()
}

// Wait blocks until all tracked goroutines complete.
func (m *Default) Wait() error {
	m.wg.Wait()
	m.errMu.Lock()
	defer m.errMu.Unlock()
	return m.err
}

// NotifyContext returns a context cancelled on SIGINT or SIGTERM.
func (m *Default) NotifyContext(parent context.Context) (context.Context, context.CancelFunc) {
	return signal.NotifyContext(parent, os.Interrupt, syscall.SIGTERM)
}

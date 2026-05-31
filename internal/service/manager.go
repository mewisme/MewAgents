package service

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"sync"

	kardianos "github.com/kardianos/service"

	"mewagents/internal/registry"
)

// Manager controls OS service lifecycle for features.
type Manager interface {
	Install(ctx context.Context, feature registry.Feature, executable string) error
	Uninstall(ctx context.Context, feature registry.Feature) error
	Stop(ctx context.Context, feature registry.Feature) error
	Run(ctx context.Context, feature registry.Feature, rt registry.Runtime, run func(context.Context, registry.Runtime, registry.Config) error) error
}

// DefaultManager wraps kardianos/service.
type DefaultManager struct{}

// NewManager creates a service manager.
func NewManager() *DefaultManager {
	return &DefaultManager{}
}

func (m *DefaultManager) serviceConfig(feature registry.Feature, executable string) *kardianos.Config {
	return &kardianos.Config{
		Name:        feature.DefaultServiceName(),
		DisplayName: feature.DefaultDisplayName(),
		Description: feature.Description(),
		Executable:  executable,
		Arguments:   []string{"run", feature.Name()},
	}
}

func (m *DefaultManager) newService(feature registry.Feature, executable string, program kardianos.Interface) (kardianos.Service, error) {
	return kardianos.New(program, m.serviceConfig(feature, executable))
}

// Install registers the feature as an OS service.
func (m *DefaultManager) Install(ctx context.Context, feature registry.Feature, executable string) error {
	if err := ctx.Err(); err != nil {
		return err
	}
	if executable == "" {
		return fmt.Errorf("service executable path is required")
	}

	svc, err := m.newService(feature, executable, &noopProgram{})
	if err != nil {
		return fmt.Errorf("create service: %w", err)
	}
	if err := svc.Install(); err != nil {
		return fmt.Errorf("install service %q: %w", feature.DefaultServiceName(), err)
	}
	return nil
}

// Uninstall removes the feature service.
func (m *DefaultManager) Uninstall(ctx context.Context, feature registry.Feature) error {
	if err := ctx.Err(); err != nil {
		return err
	}

	executable, err := currentExecutable()
	if err != nil {
		return err
	}

	svc, err := m.newService(feature, executable, &noopProgram{})
	if err != nil {
		return fmt.Errorf("create service: %w", err)
	}

	if err := svc.Stop(); err != nil {
		// Service may not be running; continue with uninstall.
		_ = err
	}
	if err := svc.Uninstall(); err != nil {
		return fmt.Errorf("uninstall service %q: %w", feature.DefaultServiceName(), err)
	}
	return nil
}

// Stop stops a running feature service.
func (m *DefaultManager) Stop(ctx context.Context, feature registry.Feature) error {
	if err := ctx.Err(); err != nil {
		return err
	}

	executable, err := currentExecutable()
	if err != nil {
		return err
	}

	svc, err := m.newService(feature, executable, &noopProgram{})
	if err != nil {
		return fmt.Errorf("create service: %w", err)
	}
	if err := svc.Stop(); err != nil {
		return fmt.Errorf("stop service %q: %w", feature.DefaultServiceName(), err)
	}
	return nil
}

// Run executes a feature under the OS service manager.
func (m *DefaultManager) Run(ctx context.Context, feature registry.Feature, rt registry.Runtime, run func(context.Context, registry.Runtime, registry.Config) error) error {
	executable, err := currentExecutable()
	if err != nil {
		return err
	}

	program := &featureProgram{
		feature: feature,
		rt:      rt,
		run:     run,
	}
	svc, err := m.newService(feature, executable, program)
	if err != nil {
		return fmt.Errorf("create service: %w", err)
	}

	logger, err := svc.Logger(nil)
	if err != nil {
		return fmt.Errorf("create service logger: %w", err)
	}
	program.logger = logger

	return svc.Run()
}

type noopProgram struct{}

func (p *noopProgram) Start(s kardianos.Service) error { return nil }
func (p *noopProgram) Stop(s kardianos.Service) error  { return nil }

type featureProgram struct {
	feature registry.Feature
	rt      registry.Runtime
	run     func(context.Context, registry.Runtime, registry.Config) error
	logger  kardianos.Logger

	mu     sync.Mutex
	cancel context.CancelFunc
	done   chan struct{}
}

func (p *featureProgram) Start(s kardianos.Service) error {
	p.mu.Lock()
	defer p.mu.Unlock()

	ctx, cancel := context.WithCancel(context.Background())
	p.cancel = cancel
	p.done = make(chan struct{})

	go func() {
		defer close(p.done)

		cfg := p.feature.NewConfig()
		if err := p.rt.Config().Load(p.feature.Name(), cfg); err != nil {
			_ = p.logger.Error(fmt.Errorf("load config: %w", err))
			return
		}

		if err := p.run(ctx, p.rt, cfg); err != nil && ctx.Err() == nil {
			_ = p.logger.Error(err)
		}
	}()

	return nil
}

func (p *featureProgram) Stop(s kardianos.Service) error {
	p.mu.Lock()
	cancel := p.cancel
	done := p.done
	p.mu.Unlock()

	if cancel != nil {
		cancel()
	}
	if done != nil {
		<-done
	}
	return nil
}

func currentExecutable() (string, error) {
	exe, err := os.Executable()
	if err != nil {
		return "", fmt.Errorf("resolve executable: %w", err)
	}
	return filepath.Clean(exe), nil
}

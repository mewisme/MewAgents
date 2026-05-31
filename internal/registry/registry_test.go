package registry_test

import (
	"context"
	"testing"

	"mewagents/internal/registry"
)

type stubFeature struct {
	name string
}

func (s stubFeature) Name() string                         { return s.name }
func (s stubFeature) Description() string                  { return "stub" }
func (s stubFeature) DefaultServiceName() string           { return "svc-" + s.name }
func (s stubFeature) DefaultDisplayName() string           { return "Stub " + s.name }
func (s stubFeature) NewConfig() registry.Config           { return &stubConfig{name: s.name} }
func (s stubFeature) ValidateConfig(registry.Config) error { return nil }
func (s stubFeature) NewInstallFlags() any                 { return nil }
func (s stubFeature) ConfigFromInstallFlags(any) (registry.Config, error) {
	return s.NewConfig(), nil
}
func (s stubFeature) Run(_ context.Context, _ registry.Runtime, _ registry.Config) error { return nil }

type stubConfig struct {
	name string
}

func (c *stubConfig) FeatureName() string { return c.name }

func TestRegistryUnknownFeatureListsSupported(t *testing.T) {
	reg := registry.New()
	reg.Register(stubFeature{name: "alpha"})
	reg.Register(stubFeature{name: "beta"})

	_, err := reg.Get("missing")
	if err == nil {
		t.Fatal("expected error")
	}

	unknown, ok := err.(registry.ErrUnknownFeature)
	if !ok {
		t.Fatalf("expected ErrUnknownFeature, got %T", err)
	}
	if unknown.Name != "missing" {
		t.Fatalf("unexpected name: %q", unknown.Name)
	}
	if len(unknown.Supported) != 2 || unknown.Supported[0] != "alpha" || unknown.Supported[1] != "beta" {
		t.Fatalf("unexpected supported list: %#v", unknown.Supported)
	}
}

func TestRegistryDuplicatePanics(t *testing.T) {
	reg := registry.New()
	reg.Register(stubFeature{name: "dup"})
	defer func() {
		if recover() == nil {
			t.Fatal("expected panic on duplicate registration")
		}
	}()
	reg.Register(stubFeature{name: "dup"})
}

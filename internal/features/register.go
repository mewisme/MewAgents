package features

import (
	"mewagents/internal/features/shutdown"
	"mewagents/internal/registry"
)

// RegisterAll registers built-in features with the registry.
func RegisterAll(r *registry.Registry) {
	r.Register(shutdown.New())
}

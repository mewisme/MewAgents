package features

import (
	"github.com/mewisme/MewAgents/internal/features/shutdown"
	"github.com/mewisme/MewAgents/internal/registry"
)

// RegisterAll registers built-in features with the registry.
func RegisterAll(r *registry.Registry) {
	r.Register(shutdown.New())
}

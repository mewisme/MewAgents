package features

import (
	"github.com/mewisme/MewAgents/apps/agents/internal/features/shutdown"
	"github.com/mewisme/MewAgents/apps/agents/internal/registry"
)

// RegisterAll registers built-in features with the registry.
func RegisterAll(r *registry.Registry) {
	r.Register(shutdown.New())
}

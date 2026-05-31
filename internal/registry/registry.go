package registry

import (
	"fmt"
	"sort"
	"strings"
)

// ErrUnknownFeature indicates the requested feature is not registered.
type ErrUnknownFeature struct {
	Name      string
	Supported []string
}

func (e ErrUnknownFeature) Error() string {
	return fmt.Sprintf("unknown feature %q; supported: %s", e.Name, strings.Join(e.Supported, ", "))
}

// Registry holds registered features.
type Registry struct {
	features map[string]Feature
}

// New creates an empty feature registry.
func New() *Registry {
	return &Registry{
		features: make(map[string]Feature),
	}
}

// Register adds a feature to the registry.
func (r *Registry) Register(f Feature) {
	name := f.Name()
	if _, exists := r.features[name]; exists {
		panic(fmt.Sprintf("duplicate feature registration: %q", name))
	}
	r.features[name] = f
}

// Get returns a feature by name.
func (r *Registry) Get(name string) (Feature, error) {
	f, ok := r.features[name]
	if !ok {
		return nil, ErrUnknownFeature{Name: name, Supported: r.Names()}
	}
	return f, nil
}

// Names returns sorted registered feature names.
func (r *Registry) Names() []string {
	names := make([]string, 0, len(r.features))
	for name := range r.features {
		names = append(names, name)
	}
	sort.Strings(names)
	return names
}

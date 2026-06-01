package registry

import "context"

// Feature is the plugin contract for Mew Agents features.
type Feature interface {
	Name() string
	Description() string
	DefaultServiceName() string
	DefaultDisplayName() string

	NewConfig() Config
	ValidateConfig(cfg Config) error
	NewInstallFlags() any
	ConfigFromInstallFlags(flags any) (Config, error)

	Run(ctx context.Context, rt Runtime, cfg Config) error
}

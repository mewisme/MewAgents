package shutdown

import (
	"fmt"

	"github.com/mewisme/MewAgents/internal/mqtt"
	"github.com/mewisme/MewAgents/internal/registry"
)

const featureName = "shutdown"

// Feature implements the shutdown MQTT feature.
type Feature struct{}

// New creates the shutdown feature.
func New() *Feature {
	return &Feature{}
}

func (f *Feature) Name() string { return featureName }

func (f *Feature) Description() string {
	return "Remote two-step machine shutdown via MQTT."
}

func (f *Feature) DefaultServiceName() string { return "mewagents-shutdown" }

func (f *Feature) DefaultDisplayName() string { return "Mew Agents Shutdown" }

func (f *Feature) NewConfig() registry.Config { return &Config{} }

func (f *Feature) ValidateConfig(cfg registry.Config) error {
	c, ok := cfg.(*Config)
	if !ok {
		return fmt.Errorf("invalid config type for shutdown feature")
	}
	return c.Validate()
}

func (f *Feature) NewInstallFlags() any { return &InstallFlags{} }

func (f *Feature) ConfigFromInstallFlags(flags any) (registry.Config, error) {
	install, ok := flags.(*InstallFlags)
	if !ok {
		return nil, fmt.Errorf("invalid install flags type for shutdown feature")
	}
	cfg := &Config{
		URL:      install.URL,
		Username: install.Username,
		Password: install.Password,
	}
	if _, _, err := mqtt.ParseBrokerURL(cfg.URL); err != nil {
		return nil, err
	}
	return cfg, nil
}

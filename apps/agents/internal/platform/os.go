package platform

import "context"

// OS provides platform-specific operations.
type OS interface {
	ConfigRoot() (string, error)
	FeatureConfigPath(feature string) (string, error)
	RestrictFilePerm(path string) error
	Shutdown(ctx context.Context) error
}

// Default returns the default platform implementation.
func Default() OS {
	return defaultOS{}
}

type defaultOS struct{}

func (defaultOS) ConfigRoot() (string, error) {
	return ConfigRoot()
}

func (defaultOS) FeatureConfigPath(feature string) (string, error) {
	return FeatureConfigPath(feature)
}

func (defaultOS) RestrictFilePerm(path string) error {
	return restrictFilePerm(path)
}

func (defaultOS) Shutdown(ctx context.Context) error {
	return shutdown(ctx)
}

package platform

import (
	"os"
	"path/filepath"
	"runtime"
)

const productName = "MewAgents"

// ConfigRoot returns the platform-specific root directory for feature configuration.
func ConfigRoot() (string, error) {
	switch runtime.GOOS {
	case "windows":
		root := os.Getenv("ProgramData")
		if root == "" {
			return "", errMissingProgramData
		}
		return filepath.Join(root, productName), nil
	case "darwin":
		return filepath.Join("/Library/Application Support", productName), nil
	default:
		return filepath.Join("/etc", "mewagents"), nil
	}
}

// FeatureConfigPath returns the config file path for a feature.
func FeatureConfigPath(feature string) (string, error) {
	root, err := ConfigRoot()
	if err != nil {
		return "", err
	}
	return filepath.Join(root, feature, "config.json"), nil
}

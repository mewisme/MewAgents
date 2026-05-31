package config

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"

	"mewagents/internal/platform"
)

// Manager loads and saves per-feature configuration.
type Manager interface {
	Dir(feature string) (string, error)
	Path(feature string) (string, error)
	Exists(feature string) (bool, error)
	Load(feature string, cfg any) error
	Save(feature string, cfg any) error
}

// FileManager stores feature configuration as JSON files on disk.
type FileManager struct {
	platform platform.OS
}

// NewManager creates a configuration manager backed by the filesystem.
func NewManager(p platform.OS) *FileManager {
	return &FileManager{platform: p}
}

func (m *FileManager) Path(feature string) (string, error) {
	return m.platform.FeatureConfigPath(feature)
}

func (m *FileManager) Dir(feature string) (string, error) {
	path, err := m.Path(feature)
	if err != nil {
		return "", err
	}
	return filepath.Dir(path), nil
}

func (m *FileManager) Exists(feature string) (bool, error) {
	path, err := m.Path(feature)
	if err != nil {
		return false, err
	}
	_, err = os.Stat(path)
	if err == nil {
		return true, nil
	}
	if errors.Is(err, os.ErrNotExist) {
		return false, nil
	}
	return false, err
}

func (m *FileManager) Load(feature string, cfg any) error {
	path, err := m.Path(feature)
	if err != nil {
		return err
	}

	data, err := os.ReadFile(path)
	if err != nil {
		return fmt.Errorf("load config for %q: %w", feature, err)
	}

	if err := json.Unmarshal(data, cfg); err != nil {
		return fmt.Errorf("decode config for %q: %w", feature, err)
	}
	return nil
}

func (m *FileManager) Save(feature string, cfg any) error {
	path, err := m.Path(feature)
	if err != nil {
		return err
	}

	dir := filepath.Dir(path)
	if err := os.MkdirAll(dir, 0o750); err != nil {
		return fmt.Errorf("create config directory: %w", err)
	}

	data, err := json.MarshalIndent(cfg, "", "  ")
	if err != nil {
		return fmt.Errorf("encode config for %q: %w", feature, err)
	}

	tmp, err := os.CreateTemp(dir, "config-*.json")
	if err != nil {
		return fmt.Errorf("create temp config file: %w", err)
	}
	tmpPath := tmp.Name()

	cleanup := func() {
		_ = tmp.Close()
		_ = os.Remove(tmpPath)
	}

	if _, err := tmp.Write(data); err != nil {
		cleanup()
		return fmt.Errorf("write temp config file: %w", err)
	}
	if err := tmp.Close(); err != nil {
		cleanup()
		return fmt.Errorf("close temp config file: %w", err)
	}

	if err := os.Rename(tmpPath, path); err != nil {
		cleanup()
		return fmt.Errorf("replace config file: %w", err)
	}

	if err := m.platform.RestrictFilePerm(path); err != nil {
		return fmt.Errorf("restrict config permissions: %w", err)
	}
	return nil
}

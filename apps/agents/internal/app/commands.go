package app

import (
	"context"
	"fmt"
	"os"
	"path/filepath"

	"github.com/alecthomas/kong"

	"github.com/mewisme/MewAgents/apps/agents/internal/registry"
)

func (root *App) resolveFeature(name string) (registry.Feature, error) {
	return root.Registry.Get(name)
}

func featureFlagUsage(command, featureName string) string {
	return fmt.Sprintf("mewagents %s %s", command, featureName)
}

func (root *App) configFromFlags(feature registry.Feature, command, featureName string, rest []string) (registry.Config, error) {
	flags := feature.NewInstallFlags()
	if flags == nil {
		return nil, fmt.Errorf("feature %q does not support configuration flags", featureName)
	}

	parser, err := kong.New(flags, kong.Name(featureFlagUsage(command, featureName)))
	if err != nil {
		return nil, fmt.Errorf("create flag parser: %w", err)
	}
	if _, err := parser.Parse(rest); err != nil {
		return nil, err
	}

	cfg, err := feature.ConfigFromInstallFlags(flags)
	if err != nil {
		return nil, err
	}
	if err := feature.ValidateConfig(cfg); err != nil {
		return nil, fmt.Errorf("invalid configuration: %w", err)
	}
	return cfg, nil
}

func (root *App) handleInstall(featureName string, rest []string) error {
	feature, err := root.resolveFeature(featureName)
	if err != nil {
		return err
	}

	cfg, err := root.configFromFlags(feature, "install", featureName, rest)
	if err != nil {
		return err
	}

	if err := root.Runtime.Config().Save(featureName, cfg); err != nil {
		return fmt.Errorf("save configuration: %w", err)
	}

	executable, err := os.Executable()
	if err != nil {
		return fmt.Errorf("resolve executable: %w", err)
	}

	if err := root.Runtime.Service().Install(root.Runtime.Context(), feature, filepath.Clean(executable)); err != nil {
		return err
	}

	root.Runtime.Logger().Info("feature installed and started", "feature", featureName, "service", feature.DefaultServiceName())
	return nil
}

func (root *App) handleUninstall(featureName string) error {
	feature, err := root.resolveFeature(featureName)
	if err != nil {
		return err
	}

	if err := root.Runtime.Service().Uninstall(root.Runtime.Context(), feature); err != nil {
		return err
	}

	root.Runtime.Logger().Info("feature uninstalled", "feature", featureName, "service", feature.DefaultServiceName())
	return nil
}

func (root *App) handleStart(featureName string) error {
	feature, err := root.resolveFeature(featureName)
	if err != nil {
		return err
	}

	if err := root.Runtime.Service().Start(root.Runtime.Context(), feature); err != nil {
		return err
	}

	root.Runtime.Logger().Info("feature service started", "feature", featureName, "service", feature.DefaultServiceName())
	return nil
}

func (root *App) handleStop(featureName string) error {
	feature, err := root.resolveFeature(featureName)
	if err != nil {
		return err
	}

	if err := root.Runtime.Service().Stop(root.Runtime.Context(), feature); err != nil {
		return err
	}

	root.Runtime.Logger().Info("feature service stopped", "feature", featureName, "service", feature.DefaultServiceName())
	return nil
}

func (root *App) handleConsole(featureName string, rest []string) error {
	feature, err := root.resolveFeature(featureName)
	if err != nil {
		return err
	}

	var cfg registry.Config
	if len(rest) > 0 {
		cfg, err = root.configFromFlags(feature, "console", featureName, rest)
		if err != nil {
			return err
		}
	} else {
		cfg = feature.NewConfig()
		if err := root.Runtime.Config().Load(featureName, cfg); err != nil {
			return fmt.Errorf("load configuration: %w", err)
		}
		if err := feature.ValidateConfig(cfg); err != nil {
			return fmt.Errorf("invalid configuration: %w", err)
		}
	}

	ctx, cancel := root.Runtime.Lifecycle().NotifyContext(root.Runtime.Context())
	defer cancel()

	rt := root.Runtime.WithContext(ctx, cancel)
	root.Runtime.Logger().Info("starting feature in console mode", "feature", featureName)

	if err := feature.Run(ctx, rt, cfg); err != nil && ctx.Err() == nil {
		return err
	}
	return nil
}

func (root *App) handleRun(featureName string) error {
	feature, err := root.resolveFeature(featureName)
	if err != nil {
		return err
	}

	run := func(ctx context.Context, rt registry.Runtime, cfg registry.Config) error {
		if err := feature.ValidateConfig(cfg); err != nil {
			return fmt.Errorf("invalid configuration: %w", err)
		}
		return feature.Run(ctx, rt, cfg)
	}

	return root.Runtime.Service().Run(root.Runtime.Context(), feature, root.Runtime, run)
}

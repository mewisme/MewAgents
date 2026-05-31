package app

import (
	"fmt"

	"mewagents/internal/registry"
)

// App holds shared dependencies for CLI command handlers.
type App struct {
	Runtime  *Runtime
	Registry *registry.Registry
}

// CLI is the root command structure for mewagents.
type CLI struct {
	Install   InstallCmd   `cmd:"" help:"Install a feature as a system service."`
	Uninstall UninstallCmd `cmd:"" help:"Uninstall a feature service."`
	Console   ConsoleCmd   `cmd:"" help:"Run a feature in the foreground."`
	Version   VersionCmd   `cmd:"" help:"Show version, install method, and release status."`
	Update    UpdateCmd    `cmd:"" help:"Update mewagents to the latest release."`
	Run       RunCmd       `cmd:"" hidden:"" help:"Internal entry for service manager."`
}

type InstallCmd struct {
	Rest []string `arg:"" passthrough:"" help:"Feature name and install flags."`
}

func (c *InstallCmd) Run(app *App) error {
	if len(c.Rest) == 0 {
		return fmt.Errorf("feature name is required")
	}
	return app.handleInstall(c.Rest[0], c.Rest[1:])
}

type UninstallCmd struct {
	Feature string `arg:"" help:"Feature name."`
}

type ConsoleCmd struct {
	Rest []string `arg:"" passthrough:"" help:"Feature name and optional config flags."`
}

type RunCmd struct {
	Feature string `arg:"" help:"Feature name."`
}

func (c *UninstallCmd) Run(app *App) error {
	return app.handleUninstall(c.Feature)
}

func (c *ConsoleCmd) Run(app *App) error {
	if len(c.Rest) == 0 {
		return fmt.Errorf("feature name is required")
	}
	return app.handleConsole(c.Rest[0], c.Rest[1:])
}

func (c *RunCmd) Run(app *App) error {
	return app.handleRun(c.Feature)
}

package main

import (
	"context"
	"fmt"
	"os"

	"github.com/alecthomas/kong"

	"github.com/mewisme/MewAgents/internal/app"
	"github.com/mewisme/MewAgents/internal/features"
	"github.com/mewisme/MewAgents/internal/registry"
)

func main() {
	reg := registry.New()
	features.RegisterAll(reg)

	rt, err := app.NewRuntime(context.Background())
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to initialize runtime: %v\n", err)
		os.Exit(1)
	}
	defer rt.Cancel()

	application := &app.App{
		Runtime:  rt,
		Registry: reg,
	}

	var cli app.CLI
	kongCtx := kong.Parse(&cli,
		kong.Name("mewagents"),
		kong.Description("Mew Agents — cross-platform feature platform"),
		kong.Bind(application),
	)

	if err := kongCtx.Run(application); err != nil {
		fmt.Fprintf(os.Stderr, "error: %v\n", err)
		os.Exit(1)
	}
}

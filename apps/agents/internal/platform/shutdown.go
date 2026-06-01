package platform

import (
	"context"
	"os/exec"
	"runtime"
)

func shutdown(ctx context.Context) error {
	switch runtime.GOOS {
	case "windows":
		return exec.CommandContext(ctx, "shutdown", "/s", "/t", "0").Run()
	case "darwin":
		return exec.CommandContext(ctx, "osascript", "-e", `tell app "System Events" to shut down`).Run()
	default:
		return exec.CommandContext(ctx, "shutdown", "-h", "now").Run()
	}
}

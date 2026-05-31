package app

import (
	"fmt"
	"os"

	"github.com/mewisme/MewAgents/internal/selfupdate"
	"github.com/mewisme/MewAgents/internal/version"
)

type VersionCmd struct{}

func (c *VersionCmd) Run(_ *App) error {
	w := os.Stdout
	b := version.BuildInfo()

	printSection(w, "mewagents")
	rows := [][2]string{
		{"version", b.Version},
		{"platform", b.GOOS + "/" + b.GOARCH},
	}
	if b.Commit != "" {
		rows = append(rows, [2]string{"commit", b.Commit})
	}
	if b.Date != "" {
		rows = append(rows, [2]string{"built", b.Date})
	}
	if b.Dev {
		rows = append(rows, [2]string{"note", "development build"})
	}
	printKV(w, rows)

	if info, err := selfupdate.DetectInstall(); err == nil {
		fmt.Fprintln(w)
		printSection(w, "Install")
		installRows := [][2]string{
			{"method", info.Method.String()},
			{"binary", info.Exe},
		}
		hint := selfupdate.UpdateCommand(info.Method)
		if hint == "" {
			hint = "mewagents update"
		}
		installRows = append(installRows, [2]string{"update", hint})
		printKV(w, installRows)
	}

	fmt.Fprintln(w)
	printSection(w, "Release")
	if b.Dev {
		printKV(w, [][2]string{{"status", "skipped (development build)"}})
		return nil
	}

	check, err := selfupdate.Check()
	if err != nil {
		printKV(w, [][2]string{{"status", "could not check: " + err.Error()}})
		return nil
	}

	releaseRows := [][2]string{{"latest", check.Latest}}
	if check.Newer {
		releaseRows = append(releaseRows, [2]string{"status", "update available"})
		printKV(w, releaseRows)
		hint := "mewagents update"
		if cmd := selfupdate.UpdateCommand(check.Info.Method); cmd != "" {
			hint = cmd
		}
		fmt.Fprintf(w, "\nA newer release is available (%s → %s).\n", check.Current, check.Latest)
		fmt.Fprintf(w, "Run: %s\n", hint)
	} else {
		releaseRows = append(releaseRows, [2]string{"status", "up to date"})
		printKV(w, releaseRows)
	}
	return nil
}

func printSection(w fmtWriter, title string) {
	fmt.Fprintf(w, "%s\n", title)
}

func printKV(w fmtWriter, rows [][2]string) {
	for _, row := range rows {
		fmt.Fprintf(w, "  %-10s %s\n", row[0]+":", row[1])
	}
}

type fmtWriter interface {
	Write([]byte) (int, error)
}

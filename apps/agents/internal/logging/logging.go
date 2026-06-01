package logging

import (
	"io"
	"log/slog"
	"os"
)

// NewConsoleLogger creates a logger that writes to stderr.
func NewConsoleLogger() *slog.Logger {
	return slog.New(slog.NewTextHandler(os.Stderr, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}))
}

// NewServiceLogger creates a logger that writes to the provided writer.
func NewServiceLogger(w io.Writer) *slog.Logger {
	return slog.New(slog.NewTextHandler(w, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}))
}

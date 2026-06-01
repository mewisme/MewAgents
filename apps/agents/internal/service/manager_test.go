package service

import (
	"runtime"
	"testing"
)

func TestServiceDependenciesLinuxOnly(t *testing.T) {
	deps := serviceDependencies()
	if runtime.GOOS == "linux" {
		if len(deps) != 2 {
			t.Fatalf("linux dependencies = %v, want 2 systemd lines", deps)
		}
		return
	}
	if deps != nil {
		t.Fatalf("dependencies on %s = %v, want nil", runtime.GOOS, deps)
	}
}

package selfupdate

import (
	"runtime/debug"
	"strings"
	"testing"
)

func TestDetectGoInstallLocalBuild(t *testing.T) {
	bi, ok := debug.ReadBuildInfo()
	if !ok {
		t.Skip("no build info")
	}
	if strings.Contains(bi.Main.Version, "-") && detectGoInstall() {
		t.Errorf("detectGoInstall() = true for pseudo-version build %q", bi.Main.Version)
	}
}

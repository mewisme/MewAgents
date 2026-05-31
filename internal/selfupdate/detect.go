package selfupdate

import (
	"os"
	"os/exec"
	"path/filepath"
	"runtime/debug"
	"strings"
)

// InstallMethod describes how mewagents was installed.
type InstallMethod int

const (
	InstallUnknown InstallMethod = iota
	InstallBinary
	InstallHomebrew
	InstallGo
)

func (m InstallMethod) String() string {
	switch m {
	case InstallHomebrew:
		return "Homebrew"
	case InstallGo:
		return "go install"
	case InstallBinary:
		return "binary"
	default:
		return "unknown"
	}
}

// InstallInfo describes the running binary and how it was installed.
type InstallInfo struct {
	Method InstallMethod
	Exe    string
}

// DetectInstall inspects the executable path and build metadata.
func DetectInstall() (InstallInfo, error) {
	exe, err := os.Executable()
	if err != nil {
		return InstallInfo{}, err
	}
	exe, err = filepath.EvalSymlinks(exe)
	if err != nil {
		return InstallInfo{}, err
	}

	info := InstallInfo{Exe: exe, Method: InstallBinary}

	if method, ok := detectHomebrew(exe); ok {
		info.Method = method
		return info, nil
	}
	if detectGoInstall() {
		info.Method = InstallGo
		return info, nil
	}
	return info, nil
}

func detectHomebrew(exe string) (InstallMethod, bool) {
	lower := strings.ToLower(filepath.ToSlash(exe))
	if strings.Contains(lower, "/cellar/mewagents/") || strings.Contains(lower, "/caskroom/mewagents/") {
		return InstallHomebrew, true
	}
	brew, err := exec.LookPath("brew")
	if err != nil {
		return InstallUnknown, false
	}
	out, err := exec.Command(brew, "--prefix", "mewagents").Output()
	if err != nil {
		return InstallUnknown, false
	}
	prefix := strings.TrimSpace(string(out))
	if prefix == "" {
		return InstallUnknown, false
	}
	rel, err := filepath.Rel(prefix, exe)
	if err != nil {
		return InstallUnknown, false
	}
	if rel != ".." && !strings.HasPrefix(rel, ".."+string(filepath.Separator)) {
		return InstallHomebrew, true
	}
	return InstallUnknown, false
}

func detectGoInstall() bool {
	bi, ok := debug.ReadBuildInfo()
	if !ok {
		return false
	}
	path := bi.Main.Path
	if path == "github.com/mewisme/MewAgents" || strings.HasPrefix(path, "github.com/mewisme/MewAgents/") {
		return true
	}
	if path != "mewagents" {
		return false
	}
	ver := bi.Main.Version
	if ver == "" || ver == "(devel)" {
		return false
	}
	// go install @vX.Y.Z sets Main.Version to the tag; local builds use pseudo-versions.
	if strings.Contains(ver, "-") {
		return false
	}
	return strings.HasPrefix(ver, "v")
}

// UpdateCommand returns the recommended update command for the install method.
func UpdateCommand(method InstallMethod) string {
	switch method {
	case InstallHomebrew:
		return "brew upgrade mewagents"
	case InstallGo:
		return "mewagents update"
	default:
		return ""
	}
}

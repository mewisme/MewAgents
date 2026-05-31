package selfupdate

import "testing"

func TestIsNewer(t *testing.T) {
	tests := []struct {
		latest  string
		current string
		want    bool
	}{
		{"v0.2.0", "v0.1.0", true},
		{"v0.1.0", "v0.1.0", false},
		{"v0.1.0", "v0.2.0", false},
		{"v0.1.0", "", true},
		{"v0.1.0", "dev", true},
	}
	for _, tt := range tests {
		if got := isNewer(tt.latest, tt.current); got != tt.want {
			t.Errorf("isNewer(%q, %q) = %v, want %v", tt.latest, tt.current, got, tt.want)
		}
	}
}

func TestAssetFileName(t *testing.T) {
	name := assetFileName("v1.2.3")
	if name != "mewagents_1.2.3_linux_amd64.tar.gz" && name != "mewagents_1.2.3_windows_amd64.zip" {
		// GOOS-dependent; just verify prefix and version segment.
		if want := "mewagents_1.2.3_"; len(name) < len(want) || name[:len(want)] != want {
			t.Fatalf("assetFileName(v1.2.3) = %q, want prefix %q", name, want)
		}
	}
}

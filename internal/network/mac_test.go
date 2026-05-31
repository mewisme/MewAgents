package network_test

import (
	"testing"

	"mewagents/internal/network"
)

func TestNormalizeMAC(t *testing.T) {
	tests := []struct {
		in   string
		want string
		ok   bool
	}{
		{"AA:BB:CC:DD:EE:FF", "AABBCCDDEEFF", true},
		{"aa-bb-cc-dd-ee-ff", "AABBCCDDEEFF", true},
		{"AABBCCDDEEFF", "AABBCCDDEEFF", true},
		{"invalid", "", false},
		{"AA:BB:CC:DD:EE", "", false},
	}

	for _, tc := range tests {
		got, ok := network.NormalizeMAC(tc.in)
		if ok != tc.ok || got != tc.want {
			t.Fatalf("NormalizeMAC(%q) = (%q, %v), want (%q, %v)", tc.in, got, ok, tc.want, tc.ok)
		}
	}
}

func TestValidMAC(t *testing.T) {
	if !network.ValidMAC("AABBCCDDEEFF") {
		t.Fatal("expected valid mac")
	}
	if network.ValidMAC("bad") {
		t.Fatal("expected invalid mac")
	}
}

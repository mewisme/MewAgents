package network_test

import (
	"testing"

	"github.com/mewisme/MewAgents/internal/network"
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

func TestMACTopicVariants(t *testing.T) {
	variants := network.MACTopicVariants("AABBCCDDEEFF")
	if len(variants) != 3 {
		t.Fatalf("expected 3 variants, got %d: %#v", len(variants), variants)
	}
	if variants[0] != "AABBCCDDEEFF" || variants[1] != "AA:BB:CC:DD:EE:FF" || variants[2] != "AA-BB-CC-DD-EE-FF" {
		t.Fatalf("unexpected variants: %#v", variants)
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

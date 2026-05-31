package platform

import (
	"os"
	"runtime"
)

func restrictFilePerm(path string) error {
	if runtime.GOOS == "windows" {
		return nil
	}
	return os.Chmod(path, 0o600)
}

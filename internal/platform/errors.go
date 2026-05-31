package platform

import "errors"

var (
	errMissingProgramData = errors.New("ProgramData environment variable is not set")
)

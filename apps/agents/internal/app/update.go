package app

import "github.com/mewisme/MewAgents/internal/selfupdate"

type UpdateCmd struct {
	Check bool `help:"Only report if an update is available." name:"check"`
	Force bool `help:"Reinstall latest even if already up to date (go install: -a and GOPROXY=direct)."`
}

func (c *UpdateCmd) Run(_ *App) error {
	return selfupdate.Run(c.Check, c.Force)
}

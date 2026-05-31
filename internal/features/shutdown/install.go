package shutdown

// InstallFlags defines CLI flags for installing the shutdown feature.
type InstallFlags struct {
	URL      string `name:"url" short:"u" required:"" help:"MQTT broker URL (mqtt:// or mqtts://)."`
	Username string `name:"username" short:"n" required:"" help:"MQTT username."`
	Password string `name:"password" short:"p" required:"" help:"MQTT password."`
}

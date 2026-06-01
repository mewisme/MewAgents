package registry

// Config is the common configuration contract for all features.
type Config interface {
	FeatureName() string
}

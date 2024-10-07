package cloudmigrationimpl

import (
	"context"
	"fmt"

	"github.com/prometheus/alertmanager/config"

	"github.com/grafana/grafana/pkg/services/featuremgmt"
	"github.com/grafana/grafana/pkg/services/ngalert/api/tooling/definitions"
	"github.com/grafana/grafana/pkg/services/user"
)

type muteTimeInterval struct {
	Version string `json:"version,omitempty"`

	// There is a lot of custom (de)serialization logic from Alertmanager, hence we use this type as-is.
	config.MuteTimeInterval `json:",inline"`
}

func muteTimeIntervalFromModel(timeInterval *definitions.MuteTimeInterval) muteTimeInterval {
	return muteTimeInterval{
		MuteTimeInterval: config.MuteTimeInterval{
			Name:          timeInterval.Name,
			TimeIntervals: timeInterval.TimeIntervals,
		},
		// TODO: do we need version for creation? Depends on behaviour we want (ExistsOnTarget).
		// Version: timeInterval.Version,
	}
}

func (s *Service) getAlertMuteTimings(ctx context.Context, signedInUser *user.SignedInUser) ([]muteTimeInterval, error) {
	if !s.features.IsEnabledGlobally(featuremgmt.FlagOnPremToCloudMigrationsAlerts) {
		return nil, nil
	}

	muteTimings, err := s.ngAlert.Api.MuteTimings.GetMuteTimings(ctx, signedInUser.OrgID)
	if err != nil {
		return nil, fmt.Errorf("fetching ngalert mute timings: %w", err)
	}

	muteTimeIntervals := make([]muteTimeInterval, 0, len(muteTimings))

	for _, muteTiming := range muteTimings {
		muteTimeIntervals = append(muteTimeIntervals, muteTimeIntervalFromModel(&muteTiming))
	}

	return muteTimeIntervals, nil
}

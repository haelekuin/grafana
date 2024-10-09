import { locationUtil, TimeRange } from '@grafana/data';
import { config, locationService } from '@grafana/runtime';
import { Panel } from '@grafana/schema';
import { DASHBOARD_SCHEMA_VERSION } from 'app/features/dashboard/state/DashboardMigrator';
import {
  removeDashboardToFetchFromLocalStorage,
  setDashboardToFetchFromLocalStorage,
} from 'app/features/dashboard/state/initDashboard';
import { DashboardDTO } from 'app/types';

export enum GenericError {
  UNKNOWN = 'unknown-error',
  NAVIGATION = 'navigation-error',
}

export interface SubmissionError {
  error: AddToDashboardError | GenericError;
  message: string;
}

export enum AddToDashboardError {
  FETCH_DASHBOARD = 'fetch-dashboard',
  SET_DASHBOARD_LS = 'set-dashboard-ls-error',
}

interface AddPanelToDashboardOptions {
  panel: Panel;
  dashboardUid?: string;
  openInNewTab?: boolean;
  timeRange?: TimeRange;
}

export async function addToDashboard({
  panel,
  dashboardUid,
  openInNewTab,
  timeRange,
}: AddPanelToDashboardOptions): Promise<SubmissionError | undefined> {
  let dto: DashboardDTO = {
    meta: {},
    dashboard: {
      title: '',
      uid: dashboardUid ?? '',
      panels: [panel],
      schemaVersion: DASHBOARD_SCHEMA_VERSION,
    },
  };

  if (timeRange) {
    const raw = timeRange.raw;
    dto.dashboard.time = {
      from: typeof raw.from === 'string' ? raw.from : raw.from.toISOString(),
      to: typeof raw.to === 'string' ? raw.to : raw.to.toISOString(),
    };
  }

  try {
    setDashboardToFetchFromLocalStorage(dto);
  } catch {
    return {
      error: AddToDashboardError.SET_DASHBOARD_LS,
      message: 'Could not add panel to dashboard. Please try again.',
    };
  }

  const dashboardURL = getDashboardURL(dashboardUid);

  if (!openInNewTab) {
    locationService.push(locationUtil.stripBaseFromUrl(dashboardURL));
    return;
  }

  const didTabOpen = !!global.open(config.appUrl + dashboardURL, '_blank');
  if (!didTabOpen) {
    removeDashboardToFetchFromLocalStorage();
    return {
      error: GenericError.NAVIGATION,
      message: 'Could not navigate to the selected dashboard. Please try again.',
    };
  }

  return undefined;
}

function getDashboardURL(dashboardUid?: string) {
  return dashboardUid ? `d/${dashboardUid}` : 'dashboard/new';
}

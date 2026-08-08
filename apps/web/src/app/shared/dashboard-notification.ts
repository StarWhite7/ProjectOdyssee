export type DashboardNotificationCode = 'adventure-deleted' | 'adventure-deleted-by-other';

export type DashboardNotificationState = {
  notification?: {
    type: 'success';
    code: DashboardNotificationCode;
  };
};

export const DASHBOARD_NOTIFICATION_MESSAGES: Record<DashboardNotificationCode, string> = {
  'adventure-deleted': 'La partie a été supprimée définitivement.',
  'adventure-deleted-by-other': 'Cette aventure a été supprimée définitivement par l’autre joueur.',
};

export const DELETION_NOTICE_DURATION_MS = 3_500;

export function dashboardNotificationState(
  code: DashboardNotificationCode,
): DashboardNotificationState {
  return {
    notification: {
      type: 'success',
      code,
    },
  };
}

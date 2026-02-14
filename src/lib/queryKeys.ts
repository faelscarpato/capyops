const dashboardKey = ['dashboard'] as const;
const alertsCountsKey = ['alerts', 'counts'] as const;
const alertsPreviewKey = ['alerts', 'preview'] as const;

export const queryKeys = {
  dashboard: dashboardKey,
  alertsCounts: alertsCountsKey,
  alertsPreview: alertsPreviewKey,
  alerts: {
    counts: () => alertsCountsKey,
    preview: () => alertsPreviewKey
  },
  meli: {
    autoSync: () => ['meli', 'auto-sync'] as const,
    shipments: (limit = 20) => ['meli', 'shipments', limit] as const
  }
};

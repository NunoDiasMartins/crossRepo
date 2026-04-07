export const ScenarioEvents = {
  PLAN_CREATED: 'plan.created',
  DATASET_LOADED: 'dataset.loaded',
  TRANSFORM_APPLIED: 'transform.applied',
  CHART_CREATED: 'chart.created',
  ANOMALIES_DETECTED: 'anomalies.detected',
  ANNOTATIONS_ADDED: 'annotations.added',
  EXPLANATION_GENERATED: 'explanation.generated',
  SUGGESTION_OFFERED: 'suggestion.offered',
  FORECAST_GENERATED: 'forecast.generated',
  SEGMENTATION_GENERATED: 'segmentation.generated',
  REPLAY_READY: 'replay.ready',
  STATE_UPDATED: 'state.updated',
  ACTIVITY_UPDATED: 'activity.updated'
} as const;

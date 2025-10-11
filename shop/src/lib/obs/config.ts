type ObsRuntimeConfig = {
  sampling: { info: number; debug: number };
  clientLogsEnabled: boolean;
  metrics: { exposePublic: boolean };
};

const g = globalThis as unknown as { __obsConfig?: ObsRuntimeConfig };

if (!g.__obsConfig) {
  g.__obsConfig = {
    sampling: { info: Number(process.env.LOG_SAMPLE_INFO || '0.1'), debug: Number(process.env.LOG_SAMPLE_DEBUG || '0') },
    clientLogsEnabled: true,
    metrics: { exposePublic: (process.env.OBS_METRICS_PUBLIC || '').toLowerCase() === 'true' },
  };
}

export function getObsRuntimeConfig(): ObsRuntimeConfig {
  return g.__obsConfig!;
}

export function setObsRuntimeConfig(next: Partial<ObsRuntimeConfig>) {
  g.__obsConfig = { ...g.__obsConfig!, ...next, sampling: { ...g.__obsConfig!.sampling, ...(next.sampling || {}) }, metrics: { ...g.__obsConfig!.metrics, ...(next.metrics || {}) } };
}

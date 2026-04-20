import type { Metric } from 'web-vitals';

function sendToConsole(metric: Metric) {
  if (import.meta.env.DEV) {
    console.info(`[web-vitals] ${metric.name}`, Math.round(metric.value), metric.rating);
  }
}

export async function initWebVitals() {
  const { onCLS, onFID, onINP, onLCP, onTTFB } = await import('web-vitals');
  onCLS(sendToConsole);
  onFID(sendToConsole);
  onINP(sendToConsole);
  onLCP(sendToConsole);
  onTTFB(sendToConsole);
}

import { onCLS, onINP, onLCP, type Metric } from "web-vitals";

export const WEB_VITALS_TARGETS = {
  LCP: 2500,
  INP: 200,
  CLS: 0.1,
} as const;

type TargetName = keyof typeof WEB_VITALS_TARGETS;

interface VitalPayload {
  metric: string;
  id: string;
  value: number;
  rating: string;
  url: string;
  timestamp: string;
  target: number | null;
  status: "within-target" | "above-target" | "n/a";
}

declare global {
  interface Window {
    __WEB_VITALS__?: VitalPayload[];
  }
}

function resolveStatus(metric: Metric): { target: number | null; status: VitalPayload["status"] } {
  const key = metric.name as TargetName;
  const target = WEB_VITALS_TARGETS[key];

  if (typeof target !== "number") {
    return { target: null, status: "n/a" };
  }

  return {
    target,
    status: metric.value <= target ? "within-target" : "above-target",
  };
}

function reportMetric(metric: Metric) {
  const { target, status } = resolveStatus(metric);

  const payload: VitalPayload = {
    metric: metric.name,
    id: metric.id,
    value: Number(metric.value.toFixed(3)),
    rating: metric.rating,
    url: window.location.pathname,
    timestamp: new Date().toISOString(),
    target,
    status,
  };

  if (!window.__WEB_VITALS__) {
    window.__WEB_VITALS__ = [];
  }
  window.__WEB_VITALS__.push(payload);

  console.info("[web-vitals]", payload);

  const endpoint = import.meta.env.VITE_WEB_VITALS_ENDPOINT;
  if (!endpoint) return;

  const body = JSON.stringify(payload);

  if (navigator.sendBeacon) {
    navigator.sendBeacon(endpoint, body);
    return;
  }

  void fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  });
}

export function initWebVitals() {
  if (typeof window === "undefined") return;

  onLCP(reportMetric);
  onINP(reportMetric);
  onCLS(reportMetric);
}

// API-01: fetched once and cached for the session.
import { useEffect, useState } from 'react';
import { getConfig, type PublicConfig } from '../api/api';

export type { PublicConfig };

// If the API cannot be reached the apply flow is unusable anyway, so the page falls back to open
// rather than showing a closed banner nobody asked for. Failures are not cached, so a reload retries.
const FALLBACK: PublicConfig = { recruitmentOpen: true, whatsappUrl: '' };

let cached: Promise<PublicConfig> | undefined;

export function loadConfig(): Promise<PublicConfig> {
  cached ??= getConfig().catch(() => {
    cached = undefined;
    return FALLBACK;
  });
  return cached;
}

/** Test hook: forget the cached response. */
export function resetConfigCache() {
  cached = undefined;
}

/** `undefined` while loading. */
export function useConfig(): PublicConfig | undefined {
  const [config, setConfig] = useState<PublicConfig>();
  useEffect(() => {
    let live = true;
    void loadConfig().then((c) => {
      if (live) setConfig(c);
    });
    return () => {
      live = false;
    };
  }, []);
  return config;
}

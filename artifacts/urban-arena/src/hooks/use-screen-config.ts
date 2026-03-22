import { useState, useEffect } from "react";

export interface ScreenConfig {
  deviceName: string;
  locationId: number | null;
  locationName: string;
  screenId: number | null;
  screenName: string;
  moduleType: string;
  orientation: "landscape" | "portrait";
  autoplay: boolean;
  slideInterval: number;
}

const STORAGE_KEY = "ua_screen_config";

const DEFAULT_CONFIG: ScreenConfig = {
  deviceName: "",
  locationId: null,
  locationName: "",
  screenId: null,
  screenName: "",
  moduleType: "",
  orientation: "landscape",
  autoplay: true,
  slideInterval: 8,
};

export function useScreenConfig() {
  const [config, setConfig] = useState<ScreenConfig>(DEFAULT_CONFIG);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setConfig({ ...DEFAULT_CONFIG, ...JSON.parse(raw) });
    } catch {
      /* ignore */
    }
    setLoaded(true);
  }, []);

  const saveConfig = (next: Partial<ScreenConfig>) => {
    const merged = { ...config, ...next };
    setConfig(merged);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  };

  const clearConfig = () => {
    setConfig(DEFAULT_CONFIG);
    localStorage.removeItem(STORAGE_KEY);
  };

  const isConfigured = loaded && (config.screenId !== null || config.locationId !== null);

  return { config, saveConfig, clearConfig, loaded, isConfigured };
}

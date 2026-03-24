import { useListSettings, useUpsertSetting } from "@workspace/api-client-react";
import { useAuthToken } from "./use-auth";
import { useQueryClient } from "@tanstack/react-query";
import { getListSettingsQueryKey } from "@workspace/api-client-react";

export interface AppSettings {
  overlay_heading: string;
  footer_text: string;
  auto_slide: boolean;
  slide_interval: number;
  display_mode: "image_first" | "video_first" | "mixed";
  brand_color: string;
  display_title_part1: string;
  display_title_part2: string;
  admin_title_part1: string;
  admin_title_part2: string;
  logo_url: string;
  gallery_mode: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  overlay_heading: "EXPLORE",
  footer_text: "By continuing you agree to the Terms and Conditions. Must meet age requirements.",
  auto_slide: true,
  slide_interval: 5,
  display_mode: "image_first",
  brand_color: "#E50914",
  display_title_part1: "URBAN",
  display_title_part2: "ARENA",
  admin_title_part1: "Arena",
  admin_title_part2: "OS",
  logo_url: "",
  gallery_mode: false,
};

export function useAppSettings() {
  const { authHeaders } = useAuthToken();
  const queryClient = useQueryClient();

  const { data: rawSettings, isLoading } = useListSettings({
    query: { refetchInterval: 60_000, staleTime: 0, refetchOnWindowFocus: false },
    request: { headers: authHeaders },
  });

  const { mutateAsync: upsert } = useUpsertSetting({
    request: { headers: authHeaders }
  });

  const settings: AppSettings = { ...DEFAULT_SETTINGS };

  if (rawSettings) {
    rawSettings.forEach((s) => {
      if (s.key === "auto_slide") settings.auto_slide = s.value === "true";
      else if (s.key === "gallery_mode") settings.gallery_mode = s.value === "true";
      else if (s.key === "slide_interval") settings.slide_interval = parseInt(s.value, 10) || 5;
      else if (s.key in settings) {
        // @ts-ignore - dynamic assignment
        settings[s.key] = s.value;
      }
    });
  }

  const updateSetting = async (key: keyof AppSettings, value: string | boolean | number) => {
    await upsert({ data: { key, value: String(value) } });
    queryClient.invalidateQueries({ queryKey: getListSettingsQueryKey() });
  };

  return { settings, isLoading, updateSetting };
}

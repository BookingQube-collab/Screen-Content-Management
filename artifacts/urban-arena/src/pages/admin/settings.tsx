import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useAppSettings } from "@/hooks/use-app-settings";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Save, Loader2 } from "lucide-react";

export default function AdminSettings() {
  const { settings, isLoading, updateSetting } = useAppSettings();
  const [localSettings, setLocalSettings] = useState(settings);
  const [initialized, setInitialized] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isLoading && !initialized) {
      setLocalSettings(settings);
      setInitialized(true);
    }
  }, [isLoading, initialized]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      for (const [key, value] of Object.entries(localSettings)) {
        if (settings[key as keyof typeof settings] !== value) {
          await updateSetting(key as any, value as any);
        }
      }
      alert("Settings saved successfully");
    } catch (e) {
      alert("Failed to save some settings");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <AdminLayout><div className="p-12">Loading...</div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold">Display Settings</h1>
          <p className="text-muted-foreground mt-1">Configure global parameters for the kiosk interface.</p>
        </div>
        <Button onClick={handleSave} disabled={isSaving} size="lg">
          {isSaving ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Save className="w-5 h-5 mr-2" />}
          Save Settings
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* Brand Names */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-6 lg:col-span-2">
          <h2 className="text-xl font-semibold border-b border-border pb-4">Brand Names</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Display / kiosk title */}
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Shown on the kiosk setup screen and display.</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>First Part <span className="text-muted-foreground font-normal">(white)</span></Label>
                  <Input
                    value={localSettings.display_title_part1}
                    onChange={e => setLocalSettings({ ...localSettings, display_title_part1: e.target.value })}
                    placeholder="URBAN"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Second Part <span className="text-muted-foreground font-normal">(purple)</span></Label>
                  <Input
                    value={localSettings.display_title_part2}
                    onChange={e => setLocalSettings({ ...localSettings, display_title_part2: e.target.value })}
                    placeholder="ARENA"
                  />
                </div>
              </div>
              {/* Live preview */}
              <div className="p-4 rounded-xl flex items-center justify-center" style={{ background: "#0c0820" }}>
                <span className="font-black tracking-tight" style={{ fontSize: "1.75rem", color: "#fff" }}>
                  {localSettings.display_title_part1 || "URBAN"}
                  <span style={{ color: "#7C3AED" }}>{localSettings.display_title_part2 || "ARENA"}</span>
                </span>
              </div>
              <p className="text-xs text-muted-foreground text-center">Kiosk display preview</p>
            </div>

            {/* Admin panel title */}
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Shown on the admin panel login screen.</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>First Part <span className="text-muted-foreground font-normal">(white)</span></Label>
                  <Input
                    value={localSettings.admin_title_part1}
                    onChange={e => setLocalSettings({ ...localSettings, admin_title_part1: e.target.value })}
                    placeholder="Arena"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Second Part <span className="text-muted-foreground font-normal">(red)</span></Label>
                  <Input
                    value={localSettings.admin_title_part2}
                    onChange={e => setLocalSettings({ ...localSettings, admin_title_part2: e.target.value })}
                    placeholder="OS"
                  />
                </div>
              </div>
              {/* Live preview */}
              <div className="p-4 rounded-xl flex items-center justify-center bg-[#111]">
                <span className="font-bold text-foreground" style={{ fontSize: "1.75rem" }}>
                  {localSettings.admin_title_part1 || "Arena"}
                  <span className="text-primary">{localSettings.admin_title_part2 || "OS"}</span>
                </span>
              </div>
              <p className="text-xs text-muted-foreground text-center">Admin login preview</p>
            </div>
          </div>
        </div>

        {/* Global Branding */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-6">
          <h2 className="text-xl font-semibold border-b border-border pb-4">Brand & Text</h2>

          <div className="space-y-2">
            <Label>Background Overlay Heading</Label>
            <Input
              value={localSettings.overlay_heading}
              onChange={e => setLocalSettings({ ...localSettings, overlay_heading: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">The giant faded text behind the slides.</p>
          </div>

          <div className="space-y-2">
            <Label>Footer Terms Text</Label>
            <Textarea
              value={localSettings.footer_text}
              onChange={e => setLocalSettings({ ...localSettings, footer_text: e.target.value })}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Primary Brand Color (Hex)</Label>
            <div className="flex gap-4">
              <Input
                type="color"
                value={localSettings.brand_color}
                onChange={e => setLocalSettings({ ...localSettings, brand_color: e.target.value })}
                className="w-16 h-11 p-1 cursor-pointer"
              />
              <Input
                value={localSettings.brand_color}
                onChange={e => setLocalSettings({ ...localSettings, brand_color: e.target.value })}
                className="flex-1 uppercase font-mono"
              />
            </div>
          </div>
        </div>

        {/* Carousel Mechanics */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-6">
          <h2 className="text-xl font-semibold border-b border-border pb-4">Carousel Behavior</h2>

          <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-xl border border-border">
            <div>
              <Label className="text-base">Auto-Slide</Label>
              <p className="text-xs text-muted-foreground mt-1">Automatically advance slides when idle</p>
            </div>
            <Switch
              checked={localSettings.auto_slide}
              onCheckedChange={c => setLocalSettings({ ...localSettings, auto_slide: c })}
            />
          </div>

          <div className="space-y-2">
            <Label>Slide Interval (Seconds)</Label>
            <Input
              type="number"
              min={2}
              max={60}
              value={localSettings.slide_interval}
              onChange={e => setLocalSettings({ ...localSettings, slide_interval: parseInt(e.target.value) || 5 })}
              disabled={!localSettings.auto_slide}
            />
          </div>

          <div className="space-y-2">
            <Label>Background Media Preference</Label>
            <select
              className="flex h-11 w-full rounded-lg border border-input bg-background/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              value={localSettings.display_mode}
              onChange={e => setLocalSettings({ ...localSettings, display_mode: e.target.value as any })}
            >
              <option value="video_first">Video (Fallback to Image)</option>
              <option value="image_first">Image (Fallback to Video)</option>
              <option value="mixed">Mixed (Whatever is available)</option>
            </select>
          </div>
        </div>

      </div>
    </AdminLayout>
  );
}

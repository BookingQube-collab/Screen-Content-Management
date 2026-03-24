import { useState, useEffect, useRef } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useAppSettings } from "@/hooks/use-app-settings";
import { useAuthToken } from "@/hooks/use-auth";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Save, Loader2, Upload, X, ImageIcon, HardDrive } from "lucide-react";

export default function AdminSettings() {
  const { settings, isLoading, updateSetting } = useAppSettings();
  const { authHeaders } = useAuthToken();
  const [localSettings, setLocalSettings] = useState(settings);
  const [initialized, setInitialized] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/uploads/image", {
        method: "POST",
        headers: authHeaders,
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      const { url } = await res.json();
      setLocalSettings(s => ({ ...s, logo_url: url }));
    } catch {
      alert("Logo upload failed. Please try again.");
    } finally {
      setLogoUploading(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  };

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

        {/* Display Logo */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-5">
          <h2 className="text-xl font-semibold border-b border-border pb-4">Display Logo</h2>
          <p className="text-sm text-muted-foreground">Shown in the bottom-left of the kiosk footer. Recommended: transparent PNG, max height 80px.</p>

          {/* Preview */}
          <div className="flex items-center justify-center h-28 rounded-xl border-2 border-dashed border-border bg-black/30">
            {localSettings.logo_url ? (
              <img src={localSettings.logo_url} alt="Logo preview" className="max-h-20 max-w-full object-contain" />
            ) : (
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <ImageIcon className="w-8 h-8 opacity-30" />
                <span className="text-xs">No logo uploaded</span>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => logoInputRef.current?.click()}
              disabled={logoUploading}
            >
              {logoUploading
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading…</>
                : <><Upload className="w-4 h-4 mr-2" /> Upload Logo</>
              }
            </Button>
            {localSettings.logo_url && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setLocalSettings(s => ({ ...s, logo_url: "" }))}
                title="Remove logo"
              >
                <X className="w-4 h-4 text-destructive" />
              </Button>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Or paste a URL</Label>
            <Input
              placeholder="https://example.com/logo.png"
              value={localSettings.logo_url}
              onChange={e => setLocalSettings(s => ({ ...s, logo_url: e.target.value }))}
            />
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

        {/* ── Google Drive Credentials ─────────────────────────────────── */}
        <GoogleDriveSettings authHeaders={authHeaders} />

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

// ── Google Drive Credentials Component ────────────────────────────────────────

function GoogleDriveSettings({ authHeaders }: { authHeaders: Record<string, string> }) {
  const [keyJson, setKeyJson] = useState("");
  const [parentId, setParentId] = useState("");
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    // Load existing credentials from settings
    fetch("/api/settings", { headers: authHeaders })
      .then(r => r.json())
      .then((rows: { key: string; value: string }[]) => {
        const keyRow = rows.find(r => r.key === "google_drive_service_account_key");
        const pidRow = rows.find(r => r.key === "google_drive_parent_folder_id");
        if (keyRow) setKeyJson(keyRow.value);
        if (pidRow) setParentId(pidRow.value);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  const clientEmail = (() => {
    try { return keyJson ? JSON.parse(keyJson).client_email : null; } catch { return null; }
  })();

  const save = async () => {
    setSaving(true);
    setMsg(null);
    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ key: "google_drive_service_account_key", value: keyJson }),
      });
      await fetch("/api/settings", {
        method: "POST",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ key: "google_drive_parent_folder_id", value: parentId }),
      });
      setMsg({ ok: true, text: "Google Drive credentials saved." });
    } catch {
      setMsg({ ok: false, text: "Failed to save credentials." });
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) return null;

  return (
    <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-5">
      <div className="flex items-center gap-2 border-b border-border pb-4">
        <HardDrive className="w-5 h-5 text-primary" />
        <h2 className="text-xl font-semibold">Google Drive Integration</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        Paste your GCP Service Account JSON key below. The service account must have access to your Drive folder.
        Share the parent folder with <span className="font-mono text-xs text-primary">{clientEmail || "client_email from JSON"}</span>.
      </p>

      <div className="space-y-2">
        <Label>Service Account Key (JSON)</Label>
        <Textarea
          className="font-mono text-xs h-28"
          placeholder='{"type":"service_account","project_id":"...","client_email":"...","private_key":"..."}'
          value={keyJson}
          onChange={e => setKeyJson(e.target.value)}
        />
        {clientEmail && (
          <p className="text-xs text-green-400">✓ Parsed — {clientEmail}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Parent Folder ID <span className="text-muted-foreground font-normal">(optional)</span></Label>
        <Input
          className="font-mono text-sm"
          placeholder="Leave blank to use Drive root"
          value={parentId}
          onChange={e => setParentId(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Copy the folder ID from the Drive URL: drive.google.com/drive/folders/<strong>FOLDER_ID</strong>
        </p>
      </div>

      {msg && (
        <p className={`text-sm font-medium ${msg.ok ? "text-green-400" : "text-red-400"}`}>{msg.text}</p>
      )}

      <Button onClick={save} disabled={saving} size="sm">
        {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
        Save Drive Credentials
      </Button>
    </div>
  );
}

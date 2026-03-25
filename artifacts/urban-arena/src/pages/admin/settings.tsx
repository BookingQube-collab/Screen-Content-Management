import { useState, useEffect, useRef } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useAppSettings } from "@/hooks/use-app-settings";
import { useAuthToken } from "@/hooks/use-auth";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Save, Loader2, Upload, X, ImageIcon, HardDrive, ChevronDown, ChevronUp, BookOpen, AlertTriangle, CheckCircle2, Folder } from "lucide-react";

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

        {/* ── Google Drive Setup Guide ─────────────────────────────────── */}
        <DriveSetupGuide />

        {/* Carousel Mechanics */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-6">
          <h2 className="text-xl font-semibold border-b border-border pb-4">Carousel Behavior</h2>

          <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-xl border border-border">
            <div>
              <Label className="text-base">Gallery Mode</Label>
              <p className="text-xs text-muted-foreground mt-1">Hide activity info &amp; footer — show only full-screen media on the kiosk</p>
            </div>
            <Switch
              checked={localSettings.gallery_mode}
              onCheckedChange={c => setLocalSettings({ ...localSettings, gallery_mode: c })}
            />
          </div>

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

// ── Google Drive Setup Guide Component ────────────────────────────────────────

function DriveSetupGuide() {
  const [open, setOpen] = useState(false);

  const steps = [
    {
      title: "Create a Google Cloud Project",
      body: (
        <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
          <li>Go to <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">console.cloud.google.com</a></li>
          <li>Click <strong className="text-foreground">Select Project</strong> → <strong className="text-foreground">New Project</strong></li>
          <li>Enter a name (e.g. <code className="text-xs bg-secondary px-1 py-0.5 rounded">BookingQube</code>) and click <strong className="text-foreground">Create</strong></li>
        </ol>
      ),
    },
    {
      title: "Enable the Google Drive API",
      body: (
        <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
          <li>Inside your project, go to <strong className="text-foreground">APIs & Services → Library</strong></li>
          <li>Search for <strong className="text-foreground">Google Drive API</strong></li>
          <li>Click <strong className="text-foreground">Enable</strong></li>
        </ol>
      ),
    },
    {
      title: "Create a Service Account",
      body: (
        <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
          <li>Go to <strong className="text-foreground">APIs & Services → Credentials</strong></li>
          <li>Click <strong className="text-foreground">Create Credentials → Service Account</strong></li>
          <li>Enter name: <code className="text-xs bg-secondary px-1 py-0.5 rounded">drive-sync-service</code> and click <strong className="text-foreground">Create and Continue</strong></li>
          <li>Skip roles (or grant Viewer if needed), then click <strong className="text-foreground">Done</strong></li>
        </ol>
      ),
    },
    {
      title: "Generate a JSON Key — download it",
      body: (
        <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
          <li>Click on your service account</li>
          <li>Go to the <strong className="text-foreground">Keys</strong> tab</li>
          <li>Click <strong className="text-foreground">Add Key → Create New Key</strong></li>
          <li>Select <strong className="text-foreground">JSON</strong> and download the file</li>
        </ol>
      ),
    },
    {
      title: "Copy the Required Data from the JSON File",
      body: (
        <>
          <p className="text-sm text-muted-foreground mb-2">Open the downloaded file — it will look like this:</p>
          <pre className="text-xs bg-secondary/60 border border-border rounded-lg p-3 overflow-x-auto text-muted-foreground font-mono leading-relaxed">{`{
  "type": "service_account",
  "project_id": "bookingqube",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n",
  "client_email": "drive-sync-service@bookingqube.iam.gserviceaccount.com",
  ...
}`}</pre>
          <p className="text-sm text-muted-foreground mt-2">You will need: <strong className="text-foreground">the full JSON</strong> (to paste below) and the <strong className="text-foreground">client_email</strong> (for the next step).</p>
        </>
      ),
    },
    {
      title: "Share Your Drive Folder with the Service Account — CRITICAL",
      body: (
        <>
          <div className="flex items-start gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-3">
            <AlertTriangle className="w-4 h-4 text-yellow-400 flex-none mt-0.5" />
            <p className="text-xs text-yellow-300">If this step is skipped, sync will fail with an Access Denied error.</p>
          </div>
          <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
            <li>Open Google Drive and navigate to your parent (root) folder</li>
            <li>Right-click the folder → <strong className="text-foreground">Share</strong></li>
            <li>Paste the <code className="text-xs bg-secondary px-1 py-0.5 rounded">client_email</code> from your JSON key</li>
            <li>Set permission to <strong className="text-foreground">Editor</strong> and click <strong className="text-foreground">Send</strong></li>
          </ol>
        </>
      ),
    },
    {
      title: "Paste the JSON Key in Settings Above",
      body: (
        <p className="text-sm text-muted-foreground">
          Paste the full contents of the downloaded JSON file into the <strong className="text-foreground">Service Account Key (JSON)</strong> field above, then enter your <strong className="text-foreground">Parent Folder ID</strong> (the long ID in the Drive URL), and click <strong className="text-foreground">Save Drive Credentials</strong>.
        </p>
      ),
    },
    {
      title: "Test the Sync",
      body: (
        <>
          <p className="text-sm text-muted-foreground mb-2">Go to <strong className="text-foreground">Activities</strong>, click <strong className="text-foreground">Setup</strong> on an activity, then <strong className="text-foreground">Sync</strong>. It should:</p>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {["Access Drive with the service account", "Find or create the required folder hierarchy", "Fetch files and store them in the database", "Update the activity's media URLs automatically"].map(item => (
              <li key={item} className="flex items-start gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-green-400 flex-none mt-0.5" />{item}</li>
            ))}
          </ul>
        </>
      ),
    },
  ];

  const commonMistakes = [
    "Forgot to share the Drive folder → access denied",
    "Wrong GCP project selected → API not enabled",
    "JSON pasted incomplete or with extra whitespace → authentication fails",
    "Parent Folder ID is wrong → sync creates folders in Drive root instead",
    "Service account has Viewer role only → cannot create folders",
  ];

  const folderStructure = `E3 (Root folder — configured Parent Folder ID)/
  Doha Mall (Location — from location.address)/
    Urban Arena (Event — from location.name)/
      Kids Tribe (Activity name)/
        poster/
        video/
        thumbnail/
        logo/
      Ping Pong (Activity name)/
        poster/  video/  thumbnail/  logo/
  City Center (Location — address)/
    Inflatapark (Event — location name)/
      Entrance TV/
        poster/  video/  thumbnail/  logo/
      Exit TV/
        poster/  video/  thumbnail/  logo/`;

  return (
    <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 p-6 hover:bg-secondary/30 transition-colors text-left"
      >
        <BookOpen className="w-5 h-5 text-primary flex-none" />
        <div className="flex-1">
          <h2 className="text-xl font-semibold">Google Drive Setup Guide</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Step-by-step instructions for connecting your Google Drive account</p>
        </div>
        {open ? <ChevronUp className="w-5 h-5 text-muted-foreground flex-none" /> : <ChevronDown className="w-5 h-5 text-muted-foreground flex-none" />}
      </button>

      {open && (
        <div className="px-6 pb-6 space-y-6 border-t border-border pt-6">
          {/* Numbered steps */}
          <div className="space-y-4">
            {steps.map((step, i) => (
              <div key={i} className="flex gap-4">
                <div className="flex-none w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-bold mt-0.5">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm mb-1.5">{step.title}</p>
                  {step.body}
                </div>
              </div>
            ))}
          </div>

          {/* Folder structure */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Folder className="w-4 h-4 text-violet-400" />
              <p className="font-semibold text-sm">Expected Drive Folder Structure</p>
            </div>
            <pre className="text-xs bg-secondary/60 border border-border rounded-lg p-4 overflow-x-auto text-muted-foreground font-mono leading-relaxed whitespace-pre">{folderStructure}</pre>
            <p className="text-xs text-muted-foreground">
              The system creates this hierarchy automatically. <strong className="text-foreground">Location address</strong> = physical venue (optional). <strong className="text-foreground">Location name</strong> = event/brand name. <strong className="text-foreground">Activity name</strong> = individual experience.
            </p>
          </div>

          {/* Common mistakes */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-400" />
              <p className="font-semibold text-sm">Common Mistakes to Avoid</p>
            </div>
            <ul className="space-y-1.5">
              {commonMistakes.map((m, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="text-yellow-400 font-bold flex-none mt-0.5">→</span>{m}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Google Drive Credentials Component ────────────────────────────────────────

type TestStep = { label: string; ok: boolean; message: string };
type TestResult = { ok: boolean; steps: TestStep[]; folderName?: string };

function GoogleDriveSettings({ authHeaders }: { authHeaders: Record<string, string> }) {
  const [keyJson, setKeyJson] = useState("");
  const [parentId, setParentId] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
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
    setTestResult(null);
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

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/admin/drive/validate", { headers: authHeaders });
      const data: TestResult = await res.json();
      setTestResult(data);
    } catch {
      setTestResult({ ok: false, steps: [{ label: "Network", ok: false, message: "Could not reach the API." }] });
    } finally {
      setTesting(false);
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
        <Label className="flex items-center gap-1.5">
          Parent Folder ID
          <span className="text-red-400 font-semibold text-xs">REQUIRED</span>
        </Label>
        {loaded && !parentId.trim() && (
          <div className="flex items-start gap-2 rounded-lg border border-red-500/50 bg-red-500/10 p-3">
            <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
            <div className="text-xs text-red-300 space-y-1">
              <p className="font-semibold text-red-400">Drive sync is broken — Parent Folder ID is missing!</p>
              <p>Without this, the service account creates folders in its own private Drive (invisible to you). All "City Center" and similar folders will be inaccessible.</p>
              <p>Open your target Drive folder in a browser and copy the ID from the URL: <span className="font-mono bg-red-950/50 px-1 rounded">drive.google.com/drive/folders/<strong>PASTE_THIS_PART</strong></span></p>
            </div>
          </div>
        )}
        <Input
          className={`font-mono text-sm ${loaded && !parentId.trim() ? "border-red-500 focus-visible:ring-red-500" : ""}`}
          placeholder="e.g. 1jgr_opvv6En580oGMxfY3UE-zkAtLZFX7dmr"
          value={parentId}
          onChange={e => setParentId(e.target.value.trim())}
        />
        <p className="text-xs text-muted-foreground">
          Copy the folder ID from the Drive URL: drive.google.com/drive/folders/<strong>FOLDER_ID</strong>.
          Share this folder with the service account email above.
        </p>
      </div>

      {testResult && (
        <div className={`rounded-lg border p-3 space-y-2 ${testResult.ok ? "border-green-500/40 bg-green-500/10" : "border-red-500/40 bg-red-500/10"}`}>
          <p className={`text-xs font-semibold ${testResult.ok ? "text-green-400" : "text-red-400"}`}>
            {testResult.ok ? `✓ Drive connection is working — folder: "${testResult.folderName}"` : "✗ Drive connection failed"}
          </p>
          {testResult.steps.map((step, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className={`text-xs mt-0.5 ${step.ok ? "text-green-400" : "text-red-400"}`}>{step.ok ? "✓" : "✗"}</span>
              <div>
                <p className="text-xs font-medium text-foreground">{step.label}</p>
                <p className="text-xs text-muted-foreground break-all">{step.message}</p>
              </div>
            </div>
          ))}
          {!testResult.ok && testResult.steps.some(s => s.label === "Parent folder accessible" && !s.ok) && (
            <div className="mt-2 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded text-xs text-yellow-300 space-y-1">
              <p className="font-semibold">How to fix the sharing issue:</p>
              <ol className="list-decimal list-inside space-y-0.5">
                <li>Open Google Drive and find your E3 (parent) folder</li>
                <li>Right-click it → <strong>Share</strong></li>
                <li>Add: <span className="font-mono bg-black/30 px-1 rounded">{clientEmail || "service account email"}</span></li>
                <li>Set permission to <strong>Editor</strong> and click Send</li>
                <li>Come back here and click <strong>Test Connection</strong> again</li>
              </ol>
            </div>
          )}
        </div>
      )}

      {msg && (
        <p className={`text-sm font-medium ${msg.ok ? "text-green-400" : "text-red-400"}`}>{msg.text}</p>
      )}

      <div className="flex gap-2">
        <Button onClick={testConnection} disabled={testing || saving} size="sm" variant="outline">
          {testing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
          Test Connection
        </Button>
        <Button onClick={save} disabled={saving || testing} size="sm">
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          Save Drive Credentials
        </Button>
      </div>
    </div>
  );
}

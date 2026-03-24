import { useState, useEffect } from "react";
import { useRoute, useLocation, Link } from "wouter";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useRequireAuth } from "@/hooks/use-auth";
import { useGetActivity, useCreateActivity, useUpdateActivity, getListActivitiesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { MediaUpload } from "@/components/admin/MediaUpload";
import { GalleryUpload } from "@/components/admin/GalleryUpload";
import { ArrowLeft, Save, Loader2, HardDrive, RefreshCw, FolderOpen } from "lucide-react";

interface ApiLocation { id: number; name: string; }
interface ApiScreen   { id: number; name: string; locationId: number | null; moduleType: string; }

const MODULE_TYPES = ["","activity-screen","promo-slider","vertical-kiosk","welcome-screen"];

export default function AdminActivityForm() {
  const { authHeaders } = useRequireAuth();
  const [, params] = useRoute("/admin/activities/:id/edit");
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  
  const isEdit = !!params?.id;
  const id = params?.id ? parseInt(params.id) : 0;

  // Locations & Screens for assignment dropdowns
  const [locations, setLocations] = useState<ApiLocation[]>([]);
  const [screens, setScreens]     = useState<ApiScreen[]>([]);
  useEffect(() => {
    fetch("/api/admin/locations", { headers: authHeaders }).then(r => r.json()).then(setLocations).catch(() => {});
    fetch("/api/admin/screens",   { headers: authHeaders }).then(r => r.json()).then(setScreens).catch(() => {});
  }, []);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    shortDescription: "",
    fullDescription: "",
    ageLimit: 18,
    ctaText: "Explore Now",
    termsAndConditions: "",
    isActive: true,
    isFeatured: false,
    hideInfo: false,
    hideLocationLogo: false,
    logoUrl: null as string | null,
    heroImageUrl: null as string | null,
    heroVideoUrl: null as string | null,
    heroGalleryUrls: [] as string[],
    cardImageUrl: null as string | null,
    sortOrder: 0,
    // Screen assignment (optional)
    locationId:       null as number | null,
    screenId:         null as number | null,
    moduleType:       "" as string,
    isOfflineEnabled: false,
    validFrom:        "" as string,
    validTo:          "" as string,
  });

  const { data: existingData, isLoading: isLoadingExisting } = useGetActivity(id, {
    query: { enabled: isEdit },
    request: { headers: authHeaders }
  });

  useEffect(() => {
    if (existingData && isEdit) {
      setFormData({
        name: existingData.name,
        slug: existingData.slug,
        shortDescription: existingData.shortDescription || "",
        fullDescription: existingData.fullDescription || "",
        ageLimit: existingData.ageLimit,
        ctaText: existingData.ctaText,
        termsAndConditions: existingData.termsAndConditions || "",
        isActive: existingData.isActive,
        isFeatured: existingData.isFeatured,
        hideInfo: existingData.hideInfo ?? false,
        hideLocationLogo: existingData.hideLocationLogo ?? false,
        logoUrl: existingData.logoUrl || null,
        heroImageUrl: existingData.heroImageUrl || null,
        heroVideoUrl: existingData.heroVideoUrl || null,
        heroGalleryUrls: (() => { try { return JSON.parse(existingData.heroGalleryUrls || "[]") as string[]; } catch { return []; } })(),
        cardImageUrl: existingData.cardImageUrl || null,
        sortOrder: existingData.sortOrder,
        locationId: existingData.locationId ?? null,
        screenId:   existingData.screenId   ?? null,
        moduleType: existingData.moduleType  ?? "",
        isOfflineEnabled: existingData.isOfflineEnabled ?? false,
        validFrom: existingData.validFrom ? existingData.validFrom.slice(0, 16) : "",
        validTo:   existingData.validTo   ? existingData.validTo.slice(0, 16)   : "",
      });
    }
  }, [existingData, isEdit]);

  const { mutateAsync: createAct, isPending: isCreating } = useCreateActivity({
    request: { headers: authHeaders }
  });
  
  const { mutateAsync: updateAct, isPending: isUpdating } = useUpdateActivity({
    request: { headers: authHeaders }
  });

  const isSaving = isCreating || isUpdating;

  // Auto-generate slug from name if slug is empty
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setFormData(prev => ({
      ...prev,
      name: val,
      slug: prev.slug || val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const gallery = formData.heroGalleryUrls;
      const submitData = {
        ...formData,
        heroGalleryUrls: gallery.length > 0 ? JSON.stringify(gallery) : null,
        heroImageUrl: gallery[0] || formData.heroImageUrl,
      };
      if (isEdit) {
        await updateAct({ id, data: submitData });
      } else {
        await createAct({ data: submitData });
      }
      queryClient.invalidateQueries({ queryKey: getListActivitiesQueryKey() });
      setLocation("/admin/activities");
    } catch (err) {
      console.error(err);
      alert("Failed to save activity");
    }
  };

  if (isEdit && isLoadingExisting) {
    return <AdminLayout><div className="p-12 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></div></AdminLayout>;
  }

  return (
    <AdminLayout>
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/activities" className="p-2 rounded-lg hover:bg-secondary transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-display font-bold">{isEdit ? "Edit Activity" : "New Activity"}</h1>
            <p className="text-muted-foreground mt-1">Configure details and media for the kiosk display.</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Left Column: Form Details */}
        <div className="xl:col-span-2 space-y-6">
          <div className="bg-card border border-border p-6 rounded-2xl shadow-sm space-y-6">
            <h2 className="text-xl font-semibold border-b border-border pb-4">Basic Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input required value={formData.name} onChange={handleNameChange} placeholder="e.g. VR Racing" />
              </div>
              <div className="space-y-2">
                <Label>Slug (URL friendly)</Label>
                <Input required value={formData.slug} onChange={e => setFormData({...formData, slug: e.target.value})} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Short Description (Card Subtitle)</Label>
              <Input required value={formData.shortDescription} onChange={e => setFormData({...formData, shortDescription: e.target.value})} maxLength={60} />
            </div>

            <div className="space-y-2">
              <Label>Full Description</Label>
              <Textarea value={formData.fullDescription} onChange={e => setFormData({...formData, fullDescription: e.target.value})} rows={4} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Age Limit</Label>
                <Input type="number" required min={0} value={formData.ageLimit} onChange={e => setFormData({...formData, ageLimit: parseInt(e.target.value) || 0})} />
              </div>
              <div className="space-y-2">
                <Label>CTA Button Text</Label>
                <Input required value={formData.ctaText} onChange={e => setFormData({...formData, ctaText: e.target.value})} />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Specific Terms & Conditions (Optional)</Label>
              <Textarea value={formData.termsAndConditions} onChange={e => setFormData({...formData, termsAndConditions: e.target.value})} rows={2} placeholder="Overrides global terms if provided" />
            </div>
          </div>

          {/* ── Screen Assignment (optional) ── */}
          <div className="bg-card border border-border p-6 rounded-2xl shadow-sm space-y-5">
            <h2 className="text-xl font-semibold border-b border-border pb-4">Screen Assignment <span className="text-sm font-normal text-muted-foreground">(Optional)</span></h2>
            <p className="text-sm text-muted-foreground -mt-2">Leave blank to show on all screens everywhere.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label>Location</Label>
                <select
                  className="w-full border border-input bg-background rounded-md px-3 py-2 text-sm"
                  value={formData.locationId ?? ""}
                  onChange={e => {
                    const id = e.target.value ? parseInt(e.target.value) : null;
                    setFormData(f => ({ ...f, locationId: id, screenId: null }));
                  }}
                >
                  <option value="">— All locations —</option>
                  {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <Label>Specific Screen / TV</Label>
                <select
                  className="w-full border border-input bg-background rounded-md px-3 py-2 text-sm"
                  value={formData.screenId ?? ""}
                  onChange={e => setFormData(f => ({ ...f, screenId: e.target.value ? parseInt(e.target.value) : null }))}
                >
                  <option value="">— All screens —</option>
                  {(formData.locationId
                    ? screens.filter(s => s.locationId === formData.locationId)
                    : screens
                  ).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <Label>Module Type</Label>
                <select
                  className="w-full border border-input bg-background rounded-md px-3 py-2 text-sm"
                  value={formData.moduleType}
                  onChange={e => setFormData(f => ({ ...f, moduleType: e.target.value }))}
                >
                  <option value="">— Any module —</option>
                  {MODULE_TYPES.filter(Boolean).map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>

              <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-xl border border-border h-fit self-end">
                <div>
                  <Label className="text-base">Offline Available</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">Cache for offline display</p>
                </div>
                <Switch checked={formData.isOfflineEnabled} onCheckedChange={v => setFormData(f => ({ ...f, isOfflineEnabled: v }))} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label>Show From (optional)</Label>
                <Input type="datetime-local" value={formData.validFrom} onChange={e => setFormData(f => ({ ...f, validFrom: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Show Until (optional)</Label>
                <Input type="datetime-local" value={formData.validTo} onChange={e => setFormData(f => ({ ...f, validTo: e.target.value }))} />
              </div>
            </div>
          </div>

          <div className="bg-card border border-border p-6 rounded-2xl shadow-sm space-y-6">
             <h2 className="text-xl font-semibold border-b border-border pb-4">Display Media</h2>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <MediaUpload 
                 label="Hero Video (Background)" 
                 type="video"
                 description="1080x1920 (9:16 portrait) MP4. Plays in full screen background."
                 value={formData.heroVideoUrl}
                 onChange={(url) => setFormData({...formData, heroVideoUrl: url})}
               />
               <GalleryUpload
                 label="Background Gallery"
                 description="1080x1920 (9:16) images — multiple images cycle as a slideshow fallback when no video."
                 value={formData.heroGalleryUrls}
                 onChange={(urls) => setFormData(f => ({ ...f, heroGalleryUrls: urls }))}
               />
             </div>
             <div className="pt-6 border-t border-border grid grid-cols-1 md:grid-cols-2 gap-8">
               <MediaUpload 
                 label="Card Thumbnail Image" 
                 type="image"
                 description="16:9 Landscape image for the slider cards."
                 value={formData.cardImageUrl}
                 onChange={(url) => setFormData({...formData, cardImageUrl: url})}
               />
               <MediaUpload
                 label="Activity Logo"
                 type="image"
                 description="Transparent PNG logo shown on the kiosk slide. Recommended max height 120px."
                 value={formData.logoUrl}
                 onChange={(url) => setFormData({...formData, logoUrl: url})}
               />
             </div>
          </div>
        </div>

        {/* Right Column: Settings & Submit */}
        <div className="space-y-6">
          <div className="bg-card border border-border p-6 rounded-2xl shadow-sm space-y-6 sticky top-8">
            <h2 className="text-xl font-semibold border-b border-border pb-4">Publishing</h2>
            
            <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-xl border border-border">
              <div>
                <Label className="text-base">Active</Label>
                <p className="text-xs text-muted-foreground mt-1">Show on the public kiosk</p>
              </div>
              <Switch checked={formData.isActive} onCheckedChange={c => setFormData({...formData, isActive: c})} />
            </div>

            <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-xl border border-border">
              <div>
                <Label className="text-base">Featured</Label>
                <p className="text-xs text-muted-foreground mt-1">Add visual highlight</p>
              </div>
              <Switch checked={formData.isFeatured} onCheckedChange={c => setFormData({...formData, isFeatured: c})} />
            </div>

            <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-xl border border-border">
              <div>
                <Label className="text-base">Hide Basic Info</Label>
                <p className="text-xs text-muted-foreground mt-1">Hide name, description &amp; age on kiosk display</p>
              </div>
              <Switch checked={formData.hideInfo} onCheckedChange={c => setFormData({...formData, hideInfo: c})} />
            </div>

            <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-xl border border-border">
              <div>
                <Label className="text-base">Hide Location Logo</Label>
                <p className="text-xs text-muted-foreground mt-1">Hide the location logo overlay on kiosk display</p>
              </div>
              <Switch checked={formData.hideLocationLogo} onCheckedChange={c => setFormData({...formData, hideLocationLogo: c})} />
            </div>

            <div className="pt-4 space-y-3">
              <Button type="submit" className="w-full" size="lg" disabled={isSaving}>
                {isSaving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />}
                {isEdit ? "Save Changes" : "Create Activity"}
              </Button>
              <Button type="button" variant="outline" className="w-full" onClick={() => setLocation("/admin/activities")}>Cancel</Button>
            </div>
          </div>
        </div>
      </form>

      {/* ── Google Drive Sync Panel — edit mode only ────────────────────────── */}
      {isEdit && (
        <div className="mt-8">
          <DriveSyncPanel activityId={id} activityName={formData.name} authHeaders={authHeaders} />
        </div>
      )}
    </AdminLayout>
  );
}

// ── Drive Sync Panel ───────────────────────────────────────────────────────────

interface DriveStatus {
  folderRecord: {
    activityFolderId: string | null;
    lastSyncAt: string | null;
    videoFolderId: string | null;
    posterFolderId: string | null;
    thumbnailFolderId: string | null;
    logoFolderId: string | null;
  } | null;
  counts: Record<string, number>;
}

function DriveSyncPanel({
  activityId,
  activityName,
  authHeaders,
}: {
  activityId: number;
  activityName: string;
  authHeaders: Record<string, string>;
}) {
  const [status, setStatus] = useState<DriveStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [setting_up, setSettingUp] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const loadStatus = () => {
    setLoadingStatus(true);
    fetch(`/api/admin/drive/${activityId}/status`, { headers: authHeaders })
      .then(r => r.json())
      .then(setStatus)
      .catch(() => setStatus(null))
      .finally(() => setLoadingStatus(false));
  };

  useEffect(() => { loadStatus(); }, [activityId]);

  const handleSetup = async () => {
    if (!activityName.trim()) {
      setMsg({ ok: false, text: "Save the activity first before setting up Drive folders." });
      return;
    }
    setSettingUp(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/drive/${activityId}/setup`, {
        method: "POST",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ activityName }),
      });
      const data = await res.json();
      setMsg({ ok: data.success, text: data.message });
      if (data.success) loadStatus();
    } catch {
      setMsg({ ok: false, text: "Setup request failed." });
    } finally {
      setSettingUp(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/drive/${activityId}/sync`, {
        method: "POST",
        headers: authHeaders,
      });
      const data = await res.json();
      setMsg({ ok: data.success, text: `${data.message} (${data.synced} files synced)` });
      if (data.errors?.length) {
        setMsg({ ok: false, text: data.errors.join("; ") });
      }
      loadStatus();
    } catch {
      setMsg({ ok: false, text: "Sync request failed." });
    } finally {
      setSyncing(false);
    }
  };

  const isSetup = !!status?.folderRecord?.activityFolderId;
  const lastSync = status?.folderRecord?.lastSyncAt
    ? new Date(status.folderRecord.lastSyncAt).toLocaleString()
    : "Never";

  return (
    <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-5">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-2">
          <HardDrive className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold">Google Drive Assets</h2>
        </div>
        {isSetup && (
          <a
            href={`https://drive.google.com/drive/folders/${status?.folderRecord?.activityFolderId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <FolderOpen className="w-4 h-4" /> Open Folder
          </a>
        )}
      </div>

      {loadingStatus ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading Drive status…
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {["video", "poster", "thumbnail", "logo"].map(type => (
              <div key={type} className="bg-secondary/50 rounded-xl p-3 text-center border border-border">
                <p className="text-xs text-muted-foreground capitalize mb-1">{type}</p>
                <p className="text-2xl font-bold">{status?.counts?.[type] ?? 0}</p>
                <p className="text-xs text-muted-foreground">files</p>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Status: <span className={isSetup ? "text-green-400" : "text-yellow-400"}>
                {isSetup ? "Folders ready" : "Not set up"}
              </span>
            </span>
            <span className="text-muted-foreground">Last sync: {lastSync}</span>
          </div>

          {msg && (
            <p className={`text-sm font-medium ${msg.ok ? "text-green-400" : "text-red-400"}`}>{msg.text}</p>
          )}

          <div className="flex gap-3 flex-wrap">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSetup}
              disabled={setting_up || syncing}
            >
              {setting_up ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <FolderOpen className="w-4 h-4 mr-2" />}
              {isSetup ? "Re-setup Folders" : "Setup Drive Folders"}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSync}
              disabled={!isSetup || syncing || setting_up}
            >
              {syncing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              Sync from Drive
            </Button>
          </div>

          {!isSetup && (
            <p className="text-xs text-muted-foreground bg-secondary/30 rounded-lg p-3">
              Click <strong>Setup Drive Folders</strong> to create the folder structure:
              Urban Arena / {activityName || "Activity Name"} / (video, poster, thumbnail, logo)
            </p>
          )}
        </>
      )}
    </div>
  );
}

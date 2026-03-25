import { useState, useEffect, useRef } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useRequireAuth } from "@/hooks/use-auth";
import { useListActivities } from "@workspace/api-client-react";
import { Activity, PlayCircle, Eye, Monitor, MapPin, Tv, HardDrive, Video, Image as ImageIcon, FolderOpen, RefreshCw, X, ChevronLeft, ChevronRight, ExternalLink, Clock } from "lucide-react";
import { Link } from "wouter";

interface Location { id: number; name: string; code: string; }
interface Screen   { id: number; name: string; code: string; locationId: number | null; locationName?: string | null; isActive: boolean; }

interface DriveSummary {
  folderCount: number;
  syncedCount: number;
  totalAssets: number;
  totals: Record<string, number>;
  perActivity: {
    activityId: number;
    activityName: string;
    activityFolderId: string | null;
    hasFolders: boolean;
    lastSyncAt: string | null;
    fileCounts: Record<string, number>;
    totalFiles: number;
  }[];
}

export default function AdminDashboard() {
  const { authHeaders, assignedLocationIds } = useRequireAuth();

  const { data: activities, isLoading: loadAct } = useListActivities({
    request: { headers: authHeaders }
  });

  const [locations, setLocations] = useState<Location[]>([]);
  const [screens,   setScreens]   = useState<Screen[]>([]);
  const [loadMeta,  setLoadMeta]  = useState(true);
  const [driveSummary, setDriveSummary] = useState<DriveSummary | null>(null);
  const [loadDrive,    setLoadDrive]    = useState(true);
  const [previewActivity, setPreviewActivity] = useState<any>(null);

  const fetchDriveSummary = () => {
    setLoadDrive(true);
    fetch("/api/admin/drive/summary", { headers: authHeaders })
      .then(r => r.json())
      .then(setDriveSummary)
      .catch(() => setDriveSummary(null))
      .finally(() => setLoadDrive(false));
  };

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/locations", { headers: authHeaders }).then(r => r.json()),
      fetch("/api/admin/screens",   { headers: authHeaders }).then(r => r.json()),
    ]).then(([locs, scrs]) => { setLocations(locs); setScreens(scrs); })
      .finally(() => setLoadMeta(false));

    fetchDriveSummary();
  }, []);

  const isLoading = loadAct || loadMeta;

  // Scope data to assigned locations for non-super-admin users
  const visibleLocations = assignedLocationIds
    ? locations.filter(l => assignedLocationIds.includes(l.id))
    : locations;
  const visibleScreens = assignedLocationIds
    ? screens.filter(s => s.locationId !== null && assignedLocationIds.includes(s.locationId))
    : screens;
  const visibleActivities = assignedLocationIds
    ? activities?.filter(a => a.locationId == null || assignedLocationIds.includes(a.locationId))
    : activities;

  const total        = visibleActivities?.length        || 0;
  const activeCount  = visibleActivities?.filter(a => a.isActive).length  || 0;
  const featuredCount= visibleActivities?.filter(a => a.isFeatured).length || 0;

  const byLocation = visibleLocations.map(loc => ({
    ...loc,
    count: visibleActivities?.filter(a => a.locationId === loc.id).length || 0,
    active: visibleActivities?.filter(a => a.locationId === loc.id && a.isActive).length || 0,
  }));

  const byScreen = visibleScreens.map(scr => ({
    ...scr,
    count: visibleActivities?.filter(a => (a as any).screenId === scr.id).length || 0,
    active: visibleActivities?.filter(a => (a as any).screenId === scr.id && a.isActive).length || 0,
  }));

  const unassigned = visibleActivities?.filter(a => !a.locationId && !(a as any).screenId).length || 0;

  return (
    <AdminLayout>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">E3 Control Panel</h1>
          <p className="text-muted-foreground mt-1">System overview across all locations, screens and activities.</p>
        </div>
        <div className="flex gap-3">
          <a href="/display" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg font-medium hover:bg-secondary/80 transition-colors">
            <Eye className="w-4 h-4" />
            Preview Display
          </a>
          <Link href="/admin/activities/new" className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20">
            <PlayCircle className="w-4 h-4" />
            New Activity
          </Link>
        </div>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatsCard title="Total Activities"  value={isLoading ? "-" : total}         icon={Activity} description="Items in library" />
        <StatsCard title="Active Displays"   value={isLoading ? "-" : activeCount}   icon={Monitor}  description="Visible on kiosks" highlight />
        <StatsCard title="Featured Items"    value={isLoading ? "-" : featuredCount} icon={PlayCircle} description="Marked as featured" />
        <StatsCard title="Screens"           value={isLoading ? "-" : visibleScreens.length} icon={Tv}       description="Registered screens" />
      </div>

      {/* ── Currently Playing ──────────────────────────────────────────────── */}
      <CurrentlyPlayingSection
        isLoading={isLoading}
        visibleActivities={visibleActivities}
        visibleLocations={visibleLocations}
        visibleScreens={visibleScreens}
        driveSummary={driveSummary}
        onPreview={setPreviewActivity}
      />

      {/* ── Media preview modal ─────────────────────────────────────────────── */}
      {previewActivity && (
        <MediaPreviewModal
          activity={previewActivity}
          onClose={() => setPreviewActivity(null)}
        />
      )}

      {/* Location-wise report */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <ReportCard title="By Location" icon={MapPin}>
          {isLoading ? (
            <p className="text-muted-foreground text-sm py-4 text-center">Loading…</p>
          ) : byLocation.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4 text-center">No locations configured yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 text-muted-foreground font-medium">Location</th>
                  <th className="text-right py-2 text-muted-foreground font-medium">Total</th>
                  <th className="text-right py-2 text-muted-foreground font-medium">Active</th>
                </tr>
              </thead>
              <tbody>
                {byLocation.map(loc => (
                  <tr key={loc.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="py-2.5 font-medium">{loc.name} <span className="text-xs text-muted-foreground ml-1">{loc.code}</span></td>
                    <td className="py-2.5 text-right">{loc.count}</td>
                    <td className="py-2.5 text-right">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${loc.active > 0 ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                        {loc.active}
                      </span>
                    </td>
                  </tr>
                ))}
                {unassigned > 0 && (
                  <tr className="border-b border-border/50 text-muted-foreground">
                    <td className="py-2.5 italic">Unassigned</td>
                    <td className="py-2.5 text-right">{unassigned}</td>
                    <td className="py-2.5 text-right">—</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </ReportCard>

        {/* Screen-wise report */}
        <ReportCard title="By Screen" icon={Tv}>
          {isLoading ? (
            <p className="text-muted-foreground text-sm py-4 text-center">Loading…</p>
          ) : byScreen.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4 text-center">No screens configured yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 text-muted-foreground font-medium">Screen</th>
                  <th className="text-left py-2 text-muted-foreground font-medium">Location</th>
                  <th className="text-right py-2 text-muted-foreground font-medium">Total</th>
                  <th className="text-right py-2 text-muted-foreground font-medium">Active</th>
                </tr>
              </thead>
              <tbody>
                {byScreen.map(scr => (
                  <tr key={scr.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="py-2.5 font-medium">{scr.name}</td>
                    <td className="py-2.5 text-muted-foreground text-xs">{scr.locationName ?? "—"}</td>
                    <td className="py-2.5 text-right">{scr.count}</td>
                    <td className="py-2.5 text-right">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${scr.active > 0 ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                        {scr.active}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </ReportCard>
      </div>

      {/* Activity status breakdown */}
      <ReportCard title="Activity Overview" icon={Activity}>
        {isLoading ? (
          <p className="text-muted-foreground text-sm py-4 text-center">Loading…</p>
        ) : !visibleActivities?.length ? (
          <p className="text-muted-foreground text-sm py-4 text-center">No activities yet. <Link href="/admin/activities/new" className="text-primary underline">Add one</Link>.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 text-muted-foreground font-medium">Activity</th>
                <th className="text-left py-2 text-muted-foreground font-medium">Location</th>
                <th className="text-left py-2 text-muted-foreground font-medium">Screen</th>
                <th className="text-right py-2 text-muted-foreground font-medium">Status</th>
                <th className="text-right py-2 text-muted-foreground font-medium">Featured</th>
              </tr>
            </thead>
            <tbody>
              {visibleActivities.map(act => {
                const loc = visibleLocations.find(l => l.id === act.locationId);
                const scr = visibleScreens.find(s => s.id === (act as any).screenId);
                return (
                  <tr key={act.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="py-2.5 font-medium">{act.name}</td>
                    <td className="py-2.5 text-muted-foreground text-xs">{loc?.name ?? "—"}</td>
                    <td className="py-2.5 text-muted-foreground text-xs">{scr?.name ?? "—"}</td>
                    <td className="py-2.5 text-right">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${act.isActive ? "bg-green-500/20 text-green-400" : "bg-muted text-muted-foreground"}`}>
                        {act.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="py-2.5 text-right">
                      {act.isFeatured ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/20 text-primary">Yes</span> : <span className="text-muted-foreground">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </ReportCard>

      {/* ── Google Drive Dashboard ──────────────────────────────────────────── */}
      <div className="mt-6 bg-card border border-border rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-display font-bold">Google Drive Status</h2>
          </div>
          <button
            onClick={fetchDriveSummary}
            disabled={loadDrive}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadDrive ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* Aggregate stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {[
            { label: "Folders Setup",  value: loadDrive ? "…" : driveSummary?.folderCount ?? 0,   icon: FolderOpen, color: "text-violet-400" },
            { label: "Synced",         value: loadDrive ? "…" : driveSummary?.syncedCount ?? 0,   icon: RefreshCw,  color: "text-green-400" },
            { label: "Videos",         value: loadDrive ? "…" : driveSummary?.totals?.video ?? 0, icon: Video,      color: "text-blue-400" },
            { label: "Images",         value: loadDrive ? "…" : ((driveSummary?.totals?.poster ?? 0) + (driveSummary?.totals?.thumbnail ?? 0) + (driveSummary?.totals?.logo ?? 0)), icon: ImageIcon, color: "text-pink-400" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-secondary/50 border border-border rounded-xl p-4 flex flex-col items-center text-center gap-1">
              <Icon className={`w-4 h-4 ${color}`} />
              <span className="text-2xl font-bold">{value}</span>
              <span className="text-xs text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>

        {/* Per-activity breakdown */}
        {loadDrive ? (
          <p className="text-sm text-muted-foreground text-center py-4">Loading Drive data…</p>
        ) : !driveSummary || driveSummary.perActivity.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No Drive folders set up yet.{" "}
            <Link href="/admin/settings" className="text-primary underline">Configure credentials</Link>{" "}
            then use <Link href="/admin/activities" className="text-primary underline">Sync All from Drive</Link>.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground text-xs uppercase tracking-wider">
                  <th className="text-left py-2 font-medium">Activity</th>
                  <th className="text-center py-2 font-medium">Folders</th>
                  <th className="text-center py-2 font-medium">Video</th>
                  <th className="text-center py-2 font-medium">Poster</th>
                  <th className="text-center py-2 font-medium">Thumb</th>
                  <th className="text-center py-2 font-medium">Logo</th>
                  <th className="text-right py-2 font-medium">Last Sync</th>
                </tr>
              </thead>
              <tbody>
                {driveSummary.perActivity.map(a => (
                  <tr key={a.activityId} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="py-2.5 font-medium">
                      <div className="flex items-center gap-2">
                        {a.activityFolderId ? (
                          <a
                            href={`https://drive.google.com/drive/folders/${a.activityFolderId}`}
                            target="_blank" rel="noopener noreferrer"
                            className="hover:text-primary transition-colors truncate max-w-[160px]"
                          >
                            {a.activityName}
                          </a>
                        ) : (
                          <span className="truncate max-w-[160px]">{a.activityName}</span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${a.hasFolders ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"}`}>
                        {a.hasFolders ? "Ready" : "None"}
                      </span>
                    </td>
                    {["video", "poster", "thumbnail", "logo"].map(t => (
                      <td key={t} className="py-2.5 text-center">
                        <span className={`font-mono text-sm ${(a.fileCounts[t] ?? 0) > 0 ? "text-foreground" : "text-muted-foreground/40"}`}>
                          {a.fileCounts[t] ?? 0}
                        </span>
                      </td>
                    ))}
                    <td className="py-2.5 text-right text-xs text-muted-foreground">
                      {a.lastSyncAt ? new Date(a.lastSyncAt).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-6 bg-card border border-border rounded-2xl p-6 shadow-sm">
        <h2 className="text-xl font-display font-bold mb-4">Quick Guide</h2>
        <div className="prose prose-invert max-w-none text-muted-foreground">
          <p>The E3 Control Panel manages your kiosk display system across all locations and screens.</p>
          <ul>
            <li><strong>Activities:</strong> Create and manage the cards shown on the display. Only items marked as <em>Active</em> will appear.</li>
            <li><strong>Locations &amp; Screens:</strong> Assign activities to specific venues and screens for targeted content.</li>
            <li><strong>Media:</strong> Upload high-quality portrait (9:16) videos or images for the Hero background, and landscape (16:9) images for the Cards.</li>
            <li><strong>Settings:</strong> Control auto-slide timing, global brand colors, and the background overlay text.</li>
          </ul>
        </div>
      </div>
    </AdminLayout>
  );
}

// ── Currently Playing Section (collapsible) ───────────────────────────────────

function CurrentlyPlayingSection({ isLoading, visibleActivities, visibleLocations, visibleScreens, driveSummary, onPreview }: {
  isLoading: boolean;
  visibleActivities: any[] | undefined;
  visibleLocations: any[];
  visibleScreens: any[];
  driveSummary: DriveSummary | null;
  onPreview: (act: any) => void;
}) {
  const [open, setOpen] = useState(false);
  const activeActivities = visibleActivities?.filter(a => a.isActive) ?? [];

  return (
    <div className="mb-8 bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
      {/* Collapsible header */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 p-6 hover:bg-secondary/30 transition-colors text-left"
      >
        <Eye className="w-5 h-5 text-primary flex-none" />
        <div className="flex-1">
          <h2 className="text-xl font-display font-bold">Currently Playing</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isLoading ? "Loading…" : `${activeActivities.length} active ${activeActivities.length === 1 ? "activity" : "activities"} — click any card to preview`}
          </p>
        </div>
        {open
          ? <ChevronLeft className="w-5 h-5 text-muted-foreground flex-none rotate-90" />
          : <ChevronRight className="w-5 h-5 text-muted-foreground flex-none rotate-90" />
        }
      </button>

      {/* Expandable body */}
      {open && (
        <div className="px-6 pb-6 border-t border-border pt-5">
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Loading activities…</p>
          ) : activeActivities.length === 0 ? (
            <div className="text-center py-8">
              <Monitor className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">No active activities right now.</p>
              <Link href="/admin/activities/new" className="text-primary text-sm underline mt-1 inline-block">Add an activity</Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {activeActivities.map(act => {
                const loc = visibleLocations.find(l => l.id === act.locationId);
                const scr = visibleScreens.find(s => s.id === act.screenId);
                const driveInfo = driveSummary?.perActivity.find(p => p.activityId === act.id);
                const thumb = act.cardImageUrl || act.thumbnailUrl || act.heroImageUrl || null;
                const hasVideo = !!act.heroVideoUrl;
                return (
                  <button
                    key={act.id}
                    onClick={() => onPreview({ ...act, locationName: loc?.name ?? null, screenName: scr?.name ?? null, driveInfo })}
                    className="group bg-secondary/30 border border-border rounded-2xl overflow-hidden hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 transition-all text-left"
                  >
                    <div className="relative h-36 bg-secondary/50 flex items-center justify-center overflow-hidden">
                      {thumb ? (
                        <img src={thumb} alt={act.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <ImageIcon className="w-8 h-8 text-muted-foreground/30" />
                      )}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-10 h-10 rounded-full bg-primary/90 flex items-center justify-center">
                          {hasVideo ? <Video className="w-5 h-5 text-white" /> : <Eye className="w-5 h-5 text-white" />}
                        </div>
                      </div>
                    </div>
                    <div className="p-3 space-y-1.5">
                      <p className="font-semibold text-sm leading-tight line-clamp-1">{act.name}</p>
                      <div className="flex flex-col gap-0.5">
                        {loc && <span className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="w-3 h-3" />{loc.name}</span>}
                        {scr && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Tv className="w-3 h-3" />{scr.name}</span>}
                      </div>
                      <div className="flex items-center justify-between pt-1">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-xs font-medium bg-green-500/15 text-green-400">Live</span>
                        {driveInfo?.lastSyncAt && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />{new Date(driveInfo.lastSyncAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Media Preview Modal ────────────────────────────────────────────────────────

function MediaPreviewModal({ activity, onClose }: { activity: any; onClose: () => void }) {
  const galleryImages: string[] = (() => {
    const urls: string[] = [];
    try { if (activity.heroGalleryUrls) urls.push(...JSON.parse(activity.heroGalleryUrls)); } catch {}
    if (activity.heroImageUrl && !urls.includes(activity.heroImageUrl)) urls.push(activity.heroImageUrl);
    if (activity.cardImageUrl && !urls.includes(activity.cardImageUrl)) urls.push(activity.cardImageUrl);
    return urls;
  })();

  const [slideIdx, setSlideIdx] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hasVideo = !!activity.heroVideoUrl;
  const [mode, setMode] = useState<"video" | "gallery">(hasVideo ? "video" : "gallery");

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const prevSlide = () => setSlideIdx(i => (i - 1 + galleryImages.length) % galleryImages.length);
  const nextSlide = () => setSlideIdx(i => (i + 1) % galleryImages.length);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      <div
        className="relative z-10 bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-border flex-none">
          <div>
            <h2 className="text-xl font-display font-bold leading-tight">{activity.name}</h2>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              {activity.locationName && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="w-3 h-3" />{activity.locationName}
                </span>
              )}
              {activity.screenName && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Tv className="w-3 h-3" />{activity.screenName}
                </span>
              )}
              {activity.driveInfo?.lastSyncAt && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />Synced {new Date(activity.driveInfo.lastSyncAt).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg hover:bg-secondary ml-4 flex-none">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode tabs (show only if both exist) */}
        {hasVideo && galleryImages.length > 0 && (
          <div className="flex border-b border-border flex-none">
            <button
              onClick={() => setMode("video")}
              className={`flex-1 py-2.5 text-sm font-medium flex items-center justify-center gap-1.5 transition-colors ${mode === "video" ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Video className="w-4 h-4" />Video
            </button>
            <button
              onClick={() => setMode("gallery")}
              className={`flex-1 py-2.5 text-sm font-medium flex items-center justify-center gap-1.5 transition-colors ${mode === "gallery" ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}
            >
              <ImageIcon className="w-4 h-4" />Images ({galleryImages.length})
            </button>
          </div>
        )}

        {/* Media area */}
        <div className="flex-1 overflow-auto">
          {mode === "video" && hasVideo ? (
            <video
              ref={videoRef}
              src={activity.heroVideoUrl}
              controls
              autoPlay
              className="w-full max-h-[50vh] bg-black object-contain"
            />
          ) : galleryImages.length > 0 ? (
            <div className="relative bg-black/40">
              <img
                src={galleryImages[slideIdx]}
                alt={`${activity.name} — ${slideIdx + 1}`}
                className="w-full max-h-[50vh] object-contain mx-auto"
              />
              {galleryImages.length > 1 && (
                <>
                  <button onClick={prevSlide} className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1.5 transition-colors">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button onClick={nextSlide} className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1.5 transition-colors">
                    <ChevronRight className="w-5 h-5" />
                  </button>
                  <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
                    {galleryImages.map((_, i) => (
                      <button key={i} onClick={() => setSlideIdx(i)} className={`w-1.5 h-1.5 rounded-full transition-colors ${i === slideIdx ? "bg-white" : "bg-white/40"}`} />
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
              <ImageIcon className="w-10 h-10 opacity-30" />
              <p className="text-sm">No media assigned yet</p>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between p-4 border-t border-border bg-secondary/20 flex-none">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400">Live</span>
            {activity.isFeatured && <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/20 text-primary">Featured</span>}
          </div>
          <Link
            href={`/admin/activities/${activity.id}/edit`}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Edit Activity
          </Link>
        </div>
      </div>
    </div>
  );
}

function StatsCard({ title, value, icon: Icon, description, highlight = false }: any) {
  return (
    <div className={`
      p-6 rounded-2xl border transition-all duration-300
      ${highlight
        ? 'bg-gradient-to-br from-primary/10 to-transparent border-primary/20 shadow-lg shadow-primary/5'
        : 'bg-card border-border shadow-sm'}
    `}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <h3 className="text-4xl font-display font-bold mt-2 text-foreground">{value}</h3>
          <p className="text-xs text-muted-foreground mt-2">{description}</p>
        </div>
        <div className={`p-3 rounded-xl ${highlight ? 'bg-primary/20 text-primary' : 'bg-secondary text-muted-foreground'}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}

function ReportCard({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-4 h-4 text-primary" />
        <h2 className="text-lg font-display font-bold">{title}</h2>
      </div>
      {children}
    </div>
  );
}

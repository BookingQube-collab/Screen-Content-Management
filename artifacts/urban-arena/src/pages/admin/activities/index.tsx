import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useRequireAuth } from "@/hooks/use-auth";
import { useListActivities, useUpdateActivity, useDeleteActivity, useReorderActivity, getListActivitiesQueryKey } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Edit2, Plus, Trash2, ArrowUp, ArrowDown, Image as ImageIcon, Video, MapPin, Tv, Filter, RefreshCw, CheckCircle2, XCircle, FolderOpen } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

interface ApiLocation { id: number; name: string; code: string; }
interface ApiScreen   { id: number; name: string; code: string; locationId: number | null; }

interface SyncResult { id: number; name: string; ok: boolean; msg: string; }

export default function AdminActivities() {
  const { authHeaders, assignedLocationIds } = useRequireAuth();
  const queryClient = useQueryClient();

  const [locations, setLocations]         = useState<ApiLocation[]>([]);
  const [screens, setScreens]             = useState<ApiScreen[]>([]);
  const [filterLocationId, setFilterLocationId] = useState<number | null>(null);
  const [filterScreenId,   setFilterScreenId]   = useState<number | null>(null);

  // ── Sync All state ────────────────────────────────────────────────────────
  const [syncing, setSyncing]           = useState(false);
  const [syncProgress, setSyncProgress] = useState<{ done: number; total: number } | null>(null);
  const [syncResults, setSyncResults]   = useState<SyncResult[] | null>(null);

  const handleSyncAll = async () => {
    if (!sorted.length) return;
    setSyncing(true);
    setSyncProgress({ done: 0, total: sorted.length });
    setSyncResults(null);
    const results: SyncResult[] = [];
    for (let i = 0; i < sorted.length; i++) {
      const act = sorted[i] as any;
      try {
        // 1. Check folder status; auto-setup if not yet configured
        const statusRes = await fetch(`/api/admin/drive/${act.id}/status`, { headers: authHeaders });
        const status = await statusRes.json();

        if (!status?.folderRecord?.activityFolderId) {
          const setupRes = await fetch(`/api/admin/drive/${act.id}/setup`, {
            method: "POST",
            headers: { ...authHeaders, "Content-Type": "application/json" },
            body: JSON.stringify({ activityName: act.name }),
          });
          const setupData = await setupRes.json();
          if (!setupData.success) {
            results.push({ id: act.id, name: act.name, ok: false, msg: `Setup failed: ${setupData.message}` });
            setSyncProgress({ done: i + 1, total: sorted.length });
            continue;
          }
        }

        // 2. Sync files from Drive
        const syncRes  = await fetch(`/api/admin/drive/${act.id}/sync`, { method: "POST", headers: authHeaders });
        const syncData = await syncRes.json();
        results.push({ id: act.id, name: act.name, ok: !!syncData.success, msg: syncData.message || "" });
      } catch {
        results.push({ id: act.id, name: act.name, ok: false, msg: "Request failed" });
      }
      setSyncProgress({ done: i + 1, total: sorted.length });
    }
    setSyncResults(results);
    setSyncing(false);
  };

  useEffect(() => {
    fetch("/api/admin/locations", { headers: authHeaders }).then(r => r.json()).then(d => { if (Array.isArray(d)) setLocations(d); }).catch(() => {});
    fetch("/api/admin/screens",   { headers: authHeaders }).then(r => r.json()).then(d => { if (Array.isArray(d)) setScreens(d); }).catch(() => {});
  }, []);

  const { data: activities, isLoading } = useListActivities({
    request: { headers: authHeaders }
  });

  const { mutate: updateActivity } = useUpdateActivity({
    request: { headers: authHeaders },
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListActivitiesQueryKey() })
    }
  });

  const { mutate: deleteActivity } = useDeleteActivity({
    request: { headers: authHeaders },
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListActivitiesQueryKey() })
    }
  });

  const { mutate: reorderActivity } = useReorderActivity({
    request: { headers: authHeaders },
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListActivitiesQueryKey() })
    }
  });

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this activity?")) {
      deleteActivity({ id });
    }
  };

  const handleToggleActive = (id: number, current: boolean) => {
    updateActivity({ id, data: { isActive: !current } });
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    if (!sortedActivities) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sortedActivities.length) return;
    const currentItem = sortedActivities[index];
    const targetItem  = sortedActivities[targetIndex];
    reorderActivity({ id: currentItem.id, data: { sortOrder: targetItem.sortOrder } });
    reorderActivity({ id: targetItem.id,  data: { sortOrder: currentItem.sortOrder } });
  };

  // Restrict filter options to assigned locations/screens for non-super-admin users
  const visibleLocations = assignedLocationIds
    ? locations.filter(l => assignedLocationIds.includes(l.id))
    : locations;
  const visibleScreens = assignedLocationIds
    ? screens.filter(s => s.locationId !== null && assignedLocationIds.includes(s.locationId))
    : screens;
  const filteredScreenOptions = filterLocationId
    ? visibleScreens.filter(s => s.locationId === filterLocationId)
    : visibleScreens;

  // Sort + filter (also scope to assigned locations)
  const sorted = activities
    ? [...activities]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .filter(a => assignedLocationIds
          ? (a as any).locationId == null || assignedLocationIds.includes((a as any).locationId)
          : true)
    : [];
  const sortedActivities = sorted.filter(a => {
    if (filterLocationId && (a as any).locationId !== filterLocationId) return false;
    if (filterScreenId   && (a as any).screenId   !== filterScreenId)   return false;
    return true;
  });

  const hasFilters = filterLocationId !== null || filterScreenId !== null;

  return (
    <AdminLayout>
      <div className="flex flex-wrap gap-4 justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Manage Activities</h1>
          <p className="text-muted-foreground mt-1">Control what appears on the kiosk displays.</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Button
            variant="outline"
            onClick={handleSyncAll}
            disabled={syncing || !sorted.length}
            className="flex items-center gap-2 whitespace-nowrap"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
            {syncing && syncProgress
              ? `Syncing ${syncProgress.done} / ${syncProgress.total}…`
              : "Sync All from Drive"}
          </Button>
          <Link href="/admin/activities/new" className="flex items-center gap-2 px-4 sm:px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium shadow-lg hover:shadow-primary/25 hover:-translate-y-0.5 transition-all whitespace-nowrap">
            <Plus className="w-5 h-5" />
            Add Activity
          </Link>
        </div>
      </div>

      {/* ── Sync Results Banner ────────────────────────────────────────────── */}
      {syncResults && (
        <div className="mb-6 bg-card border border-border rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-medium text-sm">
              Drive Sync Complete —{" "}
              <span className="text-green-400">{syncResults.filter(r => r.ok).length} succeeded</span>
              {syncResults.some(r => !r.ok) && (
                <>, <span className="text-red-400">{syncResults.filter(r => !r.ok).length} failed</span></>
              )}
            </p>
            <button onClick={() => setSyncResults(null)} className="text-muted-foreground hover:text-foreground text-xs underline">Dismiss</button>
          </div>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {syncResults.map(r => (
              <div key={r.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                {r.ok
                  ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400 flex-none" />
                  : <XCircle     className="w-3.5 h-3.5 text-red-400    flex-none" />}
                <span className="font-medium text-foreground">{r.name}</span>
                <span>—</span>
                <span>{r.msg}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Filters ── */}
      <div className="flex flex-wrap gap-3 mb-6 p-4 bg-card border border-border rounded-2xl">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mr-1">
          <Filter className="w-4 h-4" />
          <span className="font-medium">Filter:</span>
        </div>

        {/* Location filter */}
        <div className="flex items-center gap-2 bg-secondary/60 border border-border rounded-xl px-3 py-2 min-w-[180px]">
          <MapPin className="w-4 h-4 text-pink-400 flex-none" />
          <select
            className="bg-transparent text-sm outline-none flex-1 text-foreground"
            value={filterLocationId ?? ""}
            onChange={e => {
              const id = e.target.value ? parseInt(e.target.value) : null;
              setFilterLocationId(id);
              setFilterScreenId(null);
            }}
          >
            <option value="">All locations</option>
            {visibleLocations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>

        {/* Screen filter */}
        <div className="flex items-center gap-2 bg-secondary/60 border border-border rounded-xl px-3 py-2 min-w-[180px]">
          <Tv className="w-4 h-4 text-violet-400 flex-none" />
          <select
            className="bg-transparent text-sm outline-none flex-1 text-foreground"
            value={filterScreenId ?? ""}
            onChange={e => setFilterScreenId(e.target.value ? parseInt(e.target.value) : null)}
          >
            <option value="">All screens</option>
            {filteredScreenOptions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setFilterLocationId(null); setFilterScreenId(null); }}
            className="text-muted-foreground hover:text-foreground"
          >
            Clear filters
          </Button>
        )}

        {hasFilters && (
          <div className="ml-auto flex items-center text-sm text-muted-foreground">
            Showing <span className="font-semibold text-foreground mx-1">{sortedActivities.length}</span> of {sorted.length}
          </div>
        )}
      </div>

      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-muted-foreground">Loading activities...</div>
        ) : sortedActivities.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mb-4">
              <ImageIcon className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-medium mb-2">
              {hasFilters ? "No activities match this filter" : "No activities yet"}
            </h3>
            <p className="text-muted-foreground mb-6">
              {hasFilters ? "Try adjusting the location or screen filter above." : "Create your first activity to show on the display."}
            </p>
            {!hasFilters && (
              <Link href="/admin/activities/new" className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-medium">
                Create Activity
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-secondary/50 border-b border-border text-muted-foreground text-sm uppercase tracking-wider">
                  <th className="p-4 font-medium w-16 text-center">Order</th>
                  <th className="p-4 font-medium">Activity Name</th>
                  <th className="p-4 font-medium">Assignment</th>
                  <th className="p-4 font-medium w-24">Media</th>
                  <th className="p-4 font-medium w-24 text-center">Status</th>
                  <th className="p-4 font-medium w-28 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sortedActivities.map((activity, idx) => {
                  const act = activity as any;
                  const locName = act.locationId ? locations.find(l => l.id === act.locationId)?.name : null;
                  const scrName = act.screenId   ? screens.find(s => s.id === act.screenId)?.name   : null;

                  return (
                    <tr key={activity.id} className="hover:bg-secondary/20 transition-colors group">
                      <td className="p-4">
                        <div className="flex flex-col items-center gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleMove(idx, 'up')} disabled={idx === 0} className="hover:text-primary disabled:opacity-30 p-1">
                            <ArrowUp className="w-4 h-4" />
                          </button>
                          <span className="text-xs font-mono">{activity.sortOrder}</span>
                          <button onClick={() => handleMove(idx, 'down')} disabled={idx === sortedActivities.length - 1} className="hover:text-primary disabled:opacity-30 p-1">
                            <ArrowDown className="w-4 h-4" />
                          </button>
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="font-medium text-foreground">{activity.name}</div>
                        <div className="text-xs text-muted-foreground mt-1 line-clamp-1">{activity.shortDescription || "No description"}</div>
                        <div className="mt-2 flex gap-2 flex-wrap">
                          <span className="px-2 py-0.5 rounded-full bg-secondary text-xs font-medium border border-border/50">
                            Age: {activity.ageLimit}+
                          </span>
                          {activity.isFeatured && (
                            <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/20 text-xs font-medium">
                              Featured
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="space-y-1.5">
                          {locName && (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <MapPin className="w-3 h-3 text-pink-400 flex-none" />
                              <span className="truncate max-w-[120px]">{locName}</span>
                            </div>
                          )}
                          {scrName && (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Tv className="w-3 h-3 text-violet-400 flex-none" />
                              <span className="truncate max-w-[120px]">{scrName}</span>
                            </div>
                          )}
                          {!locName && !scrName && (
                            <span className="text-xs text-muted-foreground/50 italic">All screens</span>
                          )}
                          {/* Drive folder path */}
                          <div className="flex items-center gap-1 text-xs text-muted-foreground/60 mt-0.5">
                            <FolderOpen className="w-3 h-3 text-amber-400/70 flex-none" />
                            <span className="font-mono truncate max-w-[140px]">
                              {locName ? `${locName} / ${activity.name}` : activity.name}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="flex gap-2">
                          {activity.heroImageUrl ? <ImageIcon className="w-5 h-5 text-green-500" /> : <ImageIcon className="w-5 h-5 text-muted-foreground/30" />}
                          {activity.heroVideoUrl  ? <Video className="w-5 h-5 text-blue-500" />      : <Video className="w-5 h-5 text-muted-foreground/30" />}
                        </div>
                      </td>

                      <td className="p-4 text-center">
                        <Switch checked={activity.isActive} onCheckedChange={() => handleToggleActive(activity.id, activity.isActive)} />
                      </td>

                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/admin/activities/${activity.id}/edit`} className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors">
                            <Edit2 className="w-4 h-4" />
                          </Link>
                          <button onClick={() => handleDelete(activity.id)} className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

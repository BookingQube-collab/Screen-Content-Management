import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useRequireAuth } from "@/hooks/use-auth";
import { useListActivities } from "@workspace/api-client-react";
import { Activity, PlayCircle, Eye, Monitor, MapPin, Tv } from "lucide-react";
import { Link } from "wouter";

interface Location { id: number; name: string; code: string; }
interface Screen   { id: number; name: string; code: string; locationId: number | null; locationName?: string | null; isActive: boolean; }

export default function AdminDashboard() {
  const { authHeaders } = useRequireAuth();

  const { data: activities, isLoading: loadAct } = useListActivities({
    request: { headers: authHeaders }
  });

  const [locations, setLocations] = useState<Location[]>([]);
  const [screens,   setScreens]   = useState<Screen[]>([]);
  const [loadMeta,  setLoadMeta]  = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/locations", { headers: authHeaders }).then(r => r.json()),
      fetch("/api/admin/screens",   { headers: authHeaders }).then(r => r.json()),
    ]).then(([locs, scrs]) => { setLocations(locs); setScreens(scrs); })
      .finally(() => setLoadMeta(false));
  }, []);

  const isLoading = loadAct || loadMeta;

  const total        = activities?.length        || 0;
  const activeCount  = activities?.filter(a => a.isActive).length  || 0;
  const featuredCount= activities?.filter(a => a.isFeatured).length || 0;

  const byLocation = locations.map(loc => ({
    ...loc,
    count: activities?.filter(a => a.locationId === loc.id).length || 0,
    active: activities?.filter(a => a.locationId === loc.id && a.isActive).length || 0,
  }));

  const byScreen = screens.map(scr => ({
    ...scr,
    count: activities?.filter(a => (a as any).screenId === scr.id).length || 0,
    active: activities?.filter(a => (a as any).screenId === scr.id && a.isActive).length || 0,
  }));

  const unassigned = activities?.filter(a => !a.locationId && !(a as any).screenId).length || 0;

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
        <StatsCard title="Screens"           value={isLoading ? "-" : screens.length} icon={Tv}       description="Registered screens" />
      </div>

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
        ) : !activities?.length ? (
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
              {activities.map(act => {
                const loc = locations.find(l => l.id === act.locationId);
                const scr = screens.find(s => s.id === (act as any).screenId);
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

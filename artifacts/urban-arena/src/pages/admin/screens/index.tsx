import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useRequireAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Loader2, Tv } from "lucide-react";

interface Location { id: number; name: string; code: string; }
interface Screen   { id: number; name: string; code: string; locationId: number | null; locationName?: string | null; moduleType: string; orientation: string; isActive: boolean; notes?: string | null; }

const MODULE_TYPES = ["activity-screen","promo-slider","vertical-kiosk","welcome-screen"];

const EMPTY = { name: "", code: "", locationId: null as number | null, moduleType: "activity-screen", orientation: "landscape", isActive: true, notes: "" };

export default function AdminScreens() {
  const { authHeaders } = useRequireAuth();
  const [rows, setRows]           = useState<Screen[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading]     = useState(true);
  const [open, setOpen]           = useState(false);
  const [editing, setEditing]     = useState<Screen | null>(null);
  const [form, setForm]           = useState(EMPTY);
  const [saving, setSaving]       = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      fetch("/api/admin/screens",   { headers: authHeaders }).then(r => r.json()),
      fetch("/api/admin/locations", { headers: authHeaders }).then(r => r.json()),
    ]).then(([scr, loc]) => { setRows(scr); setLocations(loc); }).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openNew  = () => { setEditing(null); setForm(EMPTY); setOpen(true); };
  const openEdit = (s: Screen) => {
    setEditing(s);
    setForm({ name: s.name, code: s.code, locationId: s.locationId, moduleType: s.moduleType, orientation: s.orientation, isActive: s.isActive, notes: s.notes ?? "" });
    setOpen(true);
  };

  const save = async () => {
    setSaving(true);
    const url    = editing ? `/api/admin/screens/${editing.id}` : "/api/admin/screens";
    const method = editing ? "PATCH" : "POST";
    await fetch(url, { method, headers: { ...authHeaders, "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setSaving(false);
    setOpen(false);
    load();
  };

  const remove = async (id: number) => {
    if (!confirm("Delete this screen?")) return;
    await fetch(`/api/admin/screens/${id}`, { method: "DELETE", headers: authHeaders });
    load();
  };

  return (
    <AdminLayout>
      {/* ── Header ── */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-display font-bold truncate">Screens</h1>
          <p className="text-muted-foreground mt-1 text-sm hidden sm:block">Manage individual TVs, kiosks, and display units.</p>
        </div>
        <Button onClick={openNew} size="sm" className="shrink-0">
          <Plus className="w-4 h-4 mr-1 sm:mr-2" />
          <span className="hidden sm:inline">Add Screen</span>
          <span className="sm:hidden">Add</span>
        </Button>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : rows.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl py-20 text-center text-muted-foreground">
          <Tv className="w-10 h-10 mx-auto mb-4 opacity-30" />
          <p>No screens yet. Add your first display unit.</p>
        </div>
      ) : (
        <>
          {/* Desktop table — hidden on small screens */}
          <div className="hidden md:block bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full">
              <thead className="bg-secondary/50 border-b border-border">
                <tr>
                  {["Name","Code","Location","Module","Orientation","Status",""].map(h => (
                    <th key={h} className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map(s => (
                  <tr key={s.id} className="hover:bg-secondary/30 transition-colors">
                    <td className="px-6 py-4 font-medium">{s.name}</td>
                    <td className="px-6 py-4 font-mono text-sm text-muted-foreground">{s.code}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{s.locationName || "—"}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs">{s.moduleType}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground capitalize">{s.orientation}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${s.isActive ? "bg-green-500/10 text-green-400" : "bg-secondary text-muted-foreground"}`}>
                        {s.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(s)}><Pencil className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => remove(s.id)}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile card list — shown only on small screens */}
          <div className="md:hidden space-y-3">
            {rows.map(s => (
              <div key={s.id} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
                {/* Icon */}
                <div className="shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Tv className="w-5 h-5 text-primary" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm truncate">{s.name}</span>
                    <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${s.isActive ? "bg-green-500/10 text-green-400" : "bg-secondary text-muted-foreground"}`}>
                      {s.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">{s.code}</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                    {s.locationName && (
                      <span className="text-xs text-muted-foreground">{s.locationName}</span>
                    )}
                    <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">{s.moduleType}</span>
                    <span className="text-xs text-muted-foreground capitalize">{s.orientation}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="shrink-0 flex gap-1">
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openEdit(s)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive" onClick={() => remove(s.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Dialog ── */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md w-[calc(100vw-2rem)] max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Screen" : "New Screen"}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2"><Label>Screen Name</Label><Input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Entrance TV 1" /></div>
            <div className="space-y-2"><Label>Code</Label><Input required value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="e.g. TV-ENT-01" /></div>
            <div className="space-y-2">
              <Label>Location</Label>
              <select className="w-full border border-input bg-background rounded-md px-3 py-2 text-sm" value={form.locationId ?? ""} onChange={e => setForm(f => ({ ...f, locationId: e.target.value ? parseInt(e.target.value) : null }))}>
                <option value="">— No location —</option>
                {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Module Type</Label>
              <select className="w-full border border-input bg-background rounded-md px-3 py-2 text-sm" value={form.moduleType} onChange={e => setForm(f => ({ ...f, moduleType: e.target.value }))}>
                {MODULE_TYPES.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Orientation</Label>
              <select className="w-full border border-input bg-background rounded-md px-3 py-2 text-sm" value={form.orientation} onChange={e => setForm(f => ({ ...f, orientation: e.target.value }))}>
                <option value="landscape">Landscape</option>
                <option value="portrait">Portrait</option>
              </select>
            </div>
            <div className="space-y-2"><Label>Notes (optional)</Label><Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any notes about this screen" /></div>
            <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
              <Label>Active</Label>
              <Switch checked={form.isActive} onCheckedChange={v => setForm(f => ({ ...f, isActive: v }))} />
            </div>
            <div className="flex gap-3 pt-2">
              <Button className="flex-1" onClick={save} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {editing ? "Save Changes" : "Create Screen"}
              </Button>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

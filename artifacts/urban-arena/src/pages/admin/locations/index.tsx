import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useRequireAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Loader2, MapPin } from "lucide-react";

interface Location { id: number; name: string; code: string; address?: string | null; isActive: boolean; }

const EMPTY: Omit<Location, "id"> = { name: "", code: "", address: "", isActive: true };

export default function AdminLocations() {
  const { authHeaders } = useRequireAuth();
  const [rows, setRows]       = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen]       = useState(false);
  const [editing, setEditing] = useState<Location | null>(null);
  const [form, setForm]       = useState<Omit<Location, "id">>(EMPTY);
  const [saving, setSaving]   = useState(false);

  const load = () => {
    setLoading(true);
    fetch("/api/admin/locations", { headers: authHeaders })
      .then(r => r.json()).then(setRows).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openNew  = () => { setEditing(null); setForm(EMPTY); setOpen(true); };
  const openEdit = (l: Location) => { setEditing(l); setForm({ name: l.name, code: l.code, address: l.address ?? "", isActive: l.isActive }); setOpen(true); };

  const save = async () => {
    setSaving(true);
    const url    = editing ? `/api/admin/locations/${editing.id}` : "/api/admin/locations";
    const method = editing ? "PATCH" : "POST";
    await fetch(url, { method, headers: { ...authHeaders, "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setSaving(false);
    setOpen(false);
    load();
  };

  const remove = async (id: number) => {
    if (!confirm("Delete this location?")) return;
    await fetch(`/api/admin/locations/${id}`, { method: "DELETE", headers: authHeaders });
    load();
  };

  return (
    <AdminLayout>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold">Locations</h1>
          <p className="text-muted-foreground mt-1">Manage physical venues where screens are installed.</p>
        </div>
        <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" /> Add Location</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          {rows.length === 0 ? (
            <div className="py-20 text-center text-muted-foreground">
              <MapPin className="w-10 h-10 mx-auto mb-4 opacity-30" />
              <p>No locations yet. Add your first venue.</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-secondary/50 border-b border-border">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Name</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Code</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Address</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map(l => (
                  <tr key={l.id} className="hover:bg-secondary/30 transition-colors">
                    <td className="px-6 py-4 font-medium">{l.name}</td>
                    <td className="px-6 py-4 font-mono text-sm text-muted-foreground">{l.code}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{l.address || "—"}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${l.isActive ? "bg-green-500/10 text-green-400" : "bg-secondary text-muted-foreground"}`}>
                        {l.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(l)}><Pencil className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => remove(l.id)}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Location" : "New Location"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2"><Label>Name</Label><Input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Urban Arena" /></div>
            <div className="space-y-2"><Label>Code</Label><Input required value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="e.g. UA-MAIN" /></div>
            <div className="space-y-2"><Label>Address (optional)</Label><Input value={form.address ?? ""} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Street, City" /></div>
            <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
              <Label>Active</Label>
              <Switch checked={form.isActive} onCheckedChange={v => setForm(f => ({ ...f, isActive: v }))} />
            </div>
            <div className="flex gap-3 pt-2">
              <Button className="flex-1" onClick={save} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {editing ? "Save Changes" : "Create Location"}
              </Button>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

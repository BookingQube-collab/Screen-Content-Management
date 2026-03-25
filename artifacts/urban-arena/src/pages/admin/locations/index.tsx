import { useState, useEffect, useRef } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useRequireAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Loader2, MapPin, Upload, X, ImageIcon } from "lucide-react";

interface Location { id: number; name: string; code: string; address?: string | null; logoUrl?: string | null; isActive: boolean; }

const EMPTY: Omit<Location, "id"> = { name: "", code: "", address: "", logoUrl: "", isActive: true };

export default function AdminLocations() {
  const { authHeaders, assignedLocationIds } = useRequireAuth();
  const [rows, setRows]           = useState<Location[]>([]);
  const [loading, setLoading]     = useState(true);
  const [open, setOpen]           = useState(false);
  const [editing, setEditing]     = useState<Location | null>(null);
  const [form, setForm]           = useState<Omit<Location, "id">>(EMPTY);
  const [saving, setSaving]       = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const logoInputRef              = useRef<HTMLInputElement>(null);

  const load = () => {
    setLoading(true);
    fetch("/api/admin/locations", { headers: authHeaders })
      .then(r => r.json()).then(setRows).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openNew  = () => { setEditing(null); setForm(EMPTY); setOpen(true); };
  const openEdit = (l: Location) => {
    setEditing(l);
    setForm({ name: l.name, code: l.code, address: l.address ?? "", logoUrl: l.logoUrl ?? "", isActive: l.isActive });
    setOpen(true);
  };

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
      setForm(f => ({ ...f, logoUrl: url }));
    } catch {
      alert("Logo upload failed. Please try again.");
    } finally {
      setLogoUploading(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  };

  const save = async () => {
    setSaving(true);
    const url    = editing ? `/api/admin/locations/${editing.id}` : "/api/admin/locations";
    const method = editing ? "PATCH" : "POST";
    await fetch(url, {
      method,
      headers: { ...authHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, logoUrl: form.logoUrl || null }),
    });
    setSaving(false);
    setOpen(false);
    load();
  };

  const remove = async (id: number) => {
    if (!confirm("Delete this location?")) return;
    await fetch(`/api/admin/locations/${id}`, { method: "DELETE", headers: authHeaders });
    load();
  };

  // Filter to only the user's assigned locations (super admin sees all)
  const visibleRows = assignedLocationIds
    ? rows.filter(r => assignedLocationIds.includes(r.id))
    : rows;

  return (
    <AdminLayout>
      {/* ── Header ── */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-display font-bold truncate">Locations</h1>
          <p className="text-muted-foreground mt-1 text-sm hidden sm:block">Manage physical venues where screens are installed.</p>
        </div>
        <Button onClick={openNew} size="sm" className="shrink-0">
          <Plus className="w-4 h-4 mr-1 sm:mr-2" />
          <span className="hidden sm:inline">Add Location</span>
          <span className="sm:hidden">Add</span>
        </Button>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : visibleRows.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl py-20 text-center text-muted-foreground">
          <MapPin className="w-10 h-10 mx-auto mb-4 opacity-30" />
          <p>No locations yet. Add your first venue.</p>
        </div>
      ) : (
        <>
          {/* Desktop table — hidden on small screens */}
          <div className="hidden md:block bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full">
              <thead className="bg-secondary/50 border-b border-border">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Name</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Code</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Address</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Logo</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {visibleRows.map(l => (
                  <tr key={l.id} className="hover:bg-secondary/30 transition-colors">
                    <td className="px-6 py-4 font-medium">{l.name}</td>
                    <td className="px-6 py-4 font-mono text-sm text-muted-foreground">{l.code}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{l.address || "—"}</td>
                    <td className="px-6 py-4">
                      {l.logoUrl
                        ? <img src={l.logoUrl} alt="logo" className="h-8 max-w-[80px] object-contain" />
                        : <span className="text-xs text-muted-foreground">—</span>
                      }
                    </td>
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
          </div>

          {/* Mobile card list — shown only on small screens */}
          <div className="md:hidden space-y-3">
            {visibleRows.map(l => (
              <div key={l.id} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
                {/* Logo or icon */}
                <div className="shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center overflow-hidden">
                  {l.logoUrl
                    ? <img src={l.logoUrl} alt="logo" className="w-full h-full object-contain p-1" />
                    : <MapPin className="w-5 h-5 text-primary" />
                  }
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm truncate">{l.name}</span>
                    <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${l.isActive ? "bg-green-500/10 text-green-400" : "bg-secondary text-muted-foreground"}`}>
                      {l.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">{l.code}</p>
                  {l.address && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{l.address}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="shrink-0 flex gap-1">
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openEdit(l)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive" onClick={() => remove(l.id)}>
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
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Location" : "New Location"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2"><Label>Name</Label><Input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Urban Arena" /></div>
            <div className="space-y-2"><Label>Code</Label><Input required value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="e.g. UA-MAIN" /></div>
            <div className="space-y-2"><Label>Address (optional)</Label><Input value={form.address ?? ""} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Street, City" /></div>

            {/* Logo upload */}
            <div className="space-y-2">
              <Label>Location Logo</Label>
              <div className="flex items-center justify-center h-20 rounded-xl border-2 border-dashed border-border bg-secondary/30">
                {form.logoUrl
                  ? <img src={form.logoUrl} alt="Logo" className="max-h-16 max-w-full object-contain" />
                  : <div className="flex flex-col items-center gap-1 text-muted-foreground"><ImageIcon className="w-6 h-6 opacity-30" /><span className="text-xs">No logo</span></div>
                }
              </div>
              <div className="flex gap-2">
                <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                <Button type="button" variant="outline" size="sm" className="flex-1" onClick={() => logoInputRef.current?.click()} disabled={logoUploading}>
                  {logoUploading ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Uploading…</> : <><Upload className="w-3.5 h-3.5 mr-1.5" />Upload Logo</>}
                </Button>
                {form.logoUrl && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => setForm(f => ({ ...f, logoUrl: "" }))}>
                    <X className="w-3.5 h-3.5 text-destructive" />
                  </Button>
                )}
              </div>
              <Input value={form.logoUrl ?? ""} onChange={e => setForm(f => ({ ...f, logoUrl: e.target.value }))} placeholder="Or paste a URL…" className="text-xs" />
            </div>

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

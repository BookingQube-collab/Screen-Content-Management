import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useRequireAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Loader2, Users, ShieldCheck, User, KeyRound, Eye, EyeOff } from "lucide-react";

interface AdminUser { id: number; email: string; name: string | null; role: string; createdAt: string; }
interface Location  { id: number; name: string; code: string; }
interface Activity  { id: number; name: string; locationId: number | null; }
interface Permission { id: number; userId: number; locationId: number | null; activityId: number | null; }

const EMPTY_FORM = { email: "", password: "", name: "", role: "user" as "user" | "super_admin" };

export default function AdminUsers() {
  const { authHeaders, isSuperAdmin } = useRequireAuth();
  const [, setLocation] = useLocation();

  // Redirect non-super-admins away
  useEffect(() => {
    if (isSuperAdmin === false) setLocation("/admin/dashboard");
  }, [isSuperAdmin]);

  const [users,       setUsers]       = useState<AdminUser[]>([]);
  const [locations,   setLocations]   = useState<Location[]>([]);
  const [activities,  setActivities]  = useState<Activity[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [open,        setOpen]        = useState(false);
  const [editing,     setEditing]     = useState<AdminUser | null>(null);
  const [form,        setForm]        = useState(EMPTY_FORM);
  const [saving,      setSaving]      = useState(false);
  const [showPass,    setShowPass]    = useState(false);

  // Permission management
  const [permOpen,    setPermOpen]    = useState(false);
  const [permUser,    setPermUser]    = useState<AdminUser | null>(null);
  const [perms,       setPerms]       = useState<Permission[]>([]);
  const [permSaving,  setPermSaving]  = useState(false);
  const [selLocation, setSelLocation] = useState<number | "">("");
  const [selActivity, setSelActivity] = useState<number | "">("");

  const load = () => {
    setLoading(true);
    Promise.all([
      fetch("/api/admin/users",     { headers: authHeaders }).then(r => r.json()),
      fetch("/api/admin/locations", { headers: authHeaders }).then(r => r.json()),
      fetch("/api/activities",      { headers: authHeaders }).then(r => r.json()),
    ]).then(([u, l, a]) => {
      if (Array.isArray(u)) setUsers(u);
      if (Array.isArray(l)) setLocations(l);
      if (Array.isArray(a)) setActivities(a);
    }).finally(() => setLoading(false));
  };

  useEffect(load, []);

  // ── User CRUD ──────────────────────────────────────────────────────────────
  const openNew = () => { setEditing(null); setForm(EMPTY_FORM); setShowPass(false); setOpen(true); };
  const openEdit = (u: AdminUser) => {
    setEditing(u);
    setForm({ email: u.email, password: "", name: u.name ?? "", role: u.role as any });
    setShowPass(false);
    setOpen(true);
  };

  const save = async () => {
    if (!form.email.trim()) return;
    if (!editing && !form.password.trim()) { alert("Password is required for new users"); return; }
    setSaving(true);
    const url    = editing ? `/api/admin/users/${editing.id}` : "/api/admin/users";
    const method = editing ? "PATCH" : "POST";
    const body: any = { email: form.email, name: form.name, role: form.role };
    if (form.password.trim()) body.password = form.password;
    await fetch(url, { method, headers: { ...authHeaders, "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setSaving(false);
    setOpen(false);
    load();
  };

  const remove = async (u: AdminUser) => {
    if (!confirm(`Delete user "${u.email}"? This cannot be undone.`)) return;
    await fetch(`/api/admin/users/${u.id}`, { method: "DELETE", headers: authHeaders });
    load();
  };

  // ── Permission management ──────────────────────────────────────────────────
  const openPerms = async (u: AdminUser) => {
    setPermUser(u);
    setSelLocation("");
    setSelActivity("");
    const res = await fetch(`/api/admin/users/${u.id}/permissions`, { headers: authHeaders });
    const data = await res.json();
    setPerms(Array.isArray(data) ? data : []);
    setPermOpen(true);
  };

  const addPerm = () => {
    if (!selLocation) return;
    const newPerm = { id: Date.now(), userId: permUser!.id, locationId: Number(selLocation), activityId: selActivity ? Number(selActivity) : null };
    setPerms(prev => [...prev, newPerm]);
    setSelLocation("");
    setSelActivity("");
  };

  const removePerm = (id: number) => setPerms(prev => prev.filter(p => p.id !== id));

  const savePerms = async () => {
    setPermSaving(true);
    await fetch(`/api/admin/users/${permUser!.id}/permissions`, {
      method: "PUT",
      headers: { ...authHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ permissions: perms.map(p => ({ locationId: p.locationId, activityId: p.activityId })) }),
    });
    setPermSaving(false);
    setPermOpen(false);
  };

  const filteredActivities = selLocation
    ? activities.filter(a => a.locationId === Number(selLocation))
    : activities;

  return (
    <AdminLayout>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-display font-bold truncate">Users</h1>
          <p className="text-muted-foreground mt-1 text-sm hidden sm:block">Manage admin accounts and access control.</p>
        </div>
        <Button onClick={openNew} size="sm" className="shrink-0">
          <Plus className="w-4 h-4 mr-1 sm:mr-2" />
          <span className="hidden sm:inline">Add User</span>
          <span className="sm:hidden">Add</span>
        </Button>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : users.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl py-20 text-center text-muted-foreground">
          <Users className="w-10 h-10 mx-auto mb-4 opacity-30" />
          <p>No users found.</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full">
              <thead className="bg-secondary/50 border-b border-border">
                <tr>
                  {["Name / Email", "Role", "Created", ""].map(h => (
                    <th key={h} className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-secondary/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium">{u.name || u.email}</div>
                      {u.name && <div className="text-xs text-muted-foreground mt-0.5">{u.email}</div>}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${u.role === "super_admin" ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"}`}>
                        {u.role === "super_admin" ? <ShieldCheck className="w-3 h-3" /> : <User className="w-3 h-3" />}
                        {u.role === "super_admin" ? "Super Admin" : "User"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        {u.role === "user" && (
                          <Button variant="ghost" size="sm" onClick={() => openPerms(u)} title="Manage permissions">
                            <KeyRound className="w-4 h-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => openEdit(u)}><Pencil className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => remove(u)}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {users.map(u => (
              <div key={u.id} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
                <div className="shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  {u.role === "super_admin" ? <ShieldCheck className="w-5 h-5 text-primary" /> : <User className="w-5 h-5 text-primary" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">{u.name || u.email}</div>
                  {u.name && <p className="text-xs text-muted-foreground truncate">{u.email}</p>}
                  <span className={`inline-flex items-center gap-1 mt-1 text-xs px-2 py-0.5 rounded-full ${u.role === "super_admin" ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"}`}>
                    {u.role === "super_admin" ? "Super Admin" : "User"}
                  </span>
                </div>
                <div className="shrink-0 flex gap-1">
                  {u.role === "user" && (
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openPerms(u)}><KeyRound className="w-4 h-4" /></Button>
                  )}
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openEdit(u)}><Pencil className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive" onClick={() => remove(u)}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Create / Edit user dialog ── */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md w-[calc(100vw-2rem)]">
          <DialogHeader><DialogTitle>{editing ? "Edit User" : "New User"}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Full Name (optional)</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. John Smith" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="user@example.com" />
            </div>
            <div className="space-y-2">
              <Label>{editing ? "New Password (leave blank to keep current)" : "Password"}</Label>
              <div className="relative">
                <Input
                  type={showPass ? "text" : "password"}
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder={editing ? "Leave blank to keep" : "Min 8 characters"}
                  className="pr-10"
                />
                <button type="button" onClick={() => setShowPass(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <div className="grid grid-cols-2 gap-2">
                {(["super_admin", "user"] as const).map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, role: r }))}
                    className={`flex items-center gap-2 p-3 rounded-xl border text-sm font-medium transition-colors ${form.role === r ? "bg-primary/10 border-primary text-primary" : "border-border text-muted-foreground hover:bg-secondary"}`}
                  >
                    {r === "super_admin" ? <ShieldCheck className="w-4 h-4" /> : <User className="w-4 h-4" />}
                    {r === "super_admin" ? "Super Admin" : "User"}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {form.role === "super_admin" ? "Full access to all features and data." : "Restricted access — configure permissions separately."}
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <Button className="flex-1" onClick={save} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {editing ? "Save Changes" : "Create User"}
              </Button>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Permission management dialog ── */}
      <Dialog open={permOpen} onOpenChange={setPermOpen}>
        <DialogContent className="max-w-lg w-[calc(100vw-2rem)] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Permissions — {permUser?.name || permUser?.email}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-xs text-muted-foreground">
              Grant access by location (all activities there) or by a specific activity. Super admins always see everything.
            </p>

            {/* Add permission row */}
            <div className="flex gap-2 items-end">
              <div className="flex-1 space-y-1.5">
                <Label className="text-xs">Location</Label>
                <select
                  className="w-full border border-input bg-background rounded-md px-3 py-2 text-sm"
                  value={selLocation}
                  onChange={e => { setSelLocation(e.target.value ? Number(e.target.value) : ""); setSelActivity(""); }}
                >
                  <option value="">— Select location —</option>
                  {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
              <div className="flex-1 space-y-1.5">
                <Label className="text-xs">Activity (optional)</Label>
                <select
                  className="w-full border border-input bg-background rounded-md px-3 py-2 text-sm"
                  value={selActivity}
                  onChange={e => setSelActivity(e.target.value ? Number(e.target.value) : "")}
                  disabled={!selLocation}
                >
                  <option value="">— All activities —</option>
                  {filteredActivities.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <Button size="sm" onClick={addPerm} disabled={!selLocation} className="shrink-0">
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {/* Current permissions */}
            {perms.length === 0 ? (
              <div className="text-center text-muted-foreground py-6 text-sm border border-dashed border-border rounded-xl">
                No permissions yet. Add at least one location to grant access.
              </div>
            ) : (
              <div className="space-y-2">
                {perms.map(p => {
                  const loc = locations.find(l => l.id === p.locationId);
                  const act = activities.find(a => a.id === p.activityId);
                  return (
                    <div key={p.id} className="flex items-center justify-between bg-secondary/40 border border-border rounded-lg px-3 py-2 text-sm">
                      <div>
                        <span className="font-medium">{loc?.name ?? `Location #${p.locationId}`}</span>
                        {act && <span className="text-muted-foreground ml-2">→ {act.name}</span>}
                        {!act && <span className="text-muted-foreground ml-2 text-xs">(all activities)</span>}
                      </div>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => removePerm(p.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button className="flex-1" onClick={savePerms} disabled={permSaving}>
                {permSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Save Permissions
              </Button>
              <Button variant="outline" onClick={() => setPermOpen(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

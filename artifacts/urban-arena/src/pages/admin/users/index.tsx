import { useState, useEffect, useCallback } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useRequireAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Loader2, Users, ShieldCheck, User, Eye, EyeOff, MapPin, Check } from "lucide-react";

interface AdminUser { id: number; email: string; name: string | null; role: string; createdAt: string; }
interface ApiLocation { id: number; name: string; code: string; }
interface Permission { id: number; userId: number; locationId: number | null; activityId: number | null; }

const EMPTY_FORM = { email: "", password: "", name: "", role: "user" as "user" | "super_admin", locationIds: [] as number[] };

export default function AdminUsers() {
  const { authHeaders, isSuperAdmin } = useRequireAuth();
  const [, setWouterLocation] = useLocation();

  useEffect(() => {
    if (isSuperAdmin === false) setWouterLocation("/admin/dashboard");
  }, [isSuperAdmin]);

  const [users,    setUsers]    = useState<AdminUser[]>([]);
  const [locations, setLocations] = useState<ApiLocation[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [open,     setOpen]     = useState(false);
  const [editing,  setEditing]  = useState<AdminUser | null>(null);
  const [form,     setForm]     = useState(EMPTY_FORM);
  const [saving,   setSaving]   = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [loadingPerms, setLoadingPerms] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch("/api/admin/users",     { headers: authHeaders }).then(r => r.json()),
      fetch("/api/admin/locations", { headers: authHeaders }).then(r => r.json()),
    ]).then(([u, l]) => {
      if (Array.isArray(u)) setUsers(u);
      if (Array.isArray(l)) setLocations(l);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(load, []);

  // ── Open create dialog ───────────────────────────────────────────────────────
  const openNew = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowPass(false);
    setOpen(true);
  };

  // ── Open edit dialog — also load existing location permissions ───────────────
  const openEdit = async (u: AdminUser) => {
    setEditing(u);
    setForm({ email: u.email, password: "", name: u.name ?? "", role: u.role as any, locationIds: [] });
    setShowPass(false);
    setOpen(true);

    // Load existing permissions to pre-populate location selection
    if (u.role !== "super_admin") {
      setLoadingPerms(true);
      try {
        const res = await fetch(`/api/admin/users/${u.id}/permissions`, { headers: authHeaders });
        const data: Permission[] = await res.json();
        const locIds = [...new Set(data.map(p => p.locationId).filter((id): id is number => id !== null))];
        setForm(f => ({ ...f, locationIds: locIds }));
      } catch {}
      setLoadingPerms(false);
    }
  };

  const toggleLocation = (id: number) => {
    setForm(f => ({
      ...f,
      locationIds: f.locationIds.includes(id)
        ? f.locationIds.filter(l => l !== id)
        : [...f.locationIds, id],
    }));
  };

  // ── Save user (+ permissions for non-super-admin) ───────────────────────────
  const save = async () => {
    if (!form.email.trim()) return;
    if (!editing && !form.password.trim()) { alert("Password is required for new users"); return; }
    setSaving(true);

    try {
      const url    = editing ? `/api/admin/users/${editing.id}` : "/api/admin/users";
      const method = editing ? "PATCH" : "POST";
      const body: any = { email: form.email, name: form.name, role: form.role };
      if (form.password.trim()) body.password = form.password;

      const res = await fetch(url, {
        method,
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const saved = await res.json();
      const userId = saved.id ?? editing?.id;

      // Save location permissions for non-super-admin users
      if (form.role !== "super_admin" && userId) {
        const permissions = form.locationIds.map(locationId => ({ locationId, activityId: null }));
        await fetch(`/api/admin/users/${userId}/permissions`, {
          method: "PUT",
          headers: { ...authHeaders, "Content-Type": "application/json" },
          body: JSON.stringify({ permissions }),
        });
      } else if (form.role === "super_admin" && userId) {
        // Super admin: clear any leftover permissions
        await fetch(`/api/admin/users/${userId}/permissions`, {
          method: "PUT",
          headers: { ...authHeaders, "Content-Type": "application/json" },
          body: JSON.stringify({ permissions: [] }),
        });
      }
    } catch {}

    setSaving(false);
    setOpen(false);
    load();
  };

  const remove = async (u: AdminUser) => {
    if (!confirm(`Delete user "${u.email}"? This cannot be undone.`)) return;
    await fetch(`/api/admin/users/${u.id}`, { method: "DELETE", headers: authHeaders });
    load();
  };

  return (
    <AdminLayout>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold truncate">Users</h1>
          <p className="text-muted-foreground mt-1 text-sm hidden sm:block">Manage admin accounts and location access.</p>
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
                  {["Name / Email", "Role", "Locations", "Created", ""].map(h => (
                    <th key={h} className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map(u => (
                  <UserRow
                    key={u.id}
                    user={u}
                    locations={locations}
                    authHeaders={authHeaders}
                    onEdit={() => openEdit(u)}
                    onDelete={() => remove(u)}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {users.map(u => (
              <MobileUserCard
                key={u.id}
                user={u}
                locations={locations}
                authHeaders={authHeaders}
                onEdit={() => openEdit(u)}
                onDelete={() => remove(u)}
              />
            ))}
          </div>
        </>
      )}

      {/* ── Create / Edit dialog ── */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg w-[calc(100vw-2rem)] max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit User" : "New User"}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">

            {/* Name */}
            <div className="space-y-2">
              <Label>Full Name (optional)</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. John Smith" />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="user@example.com" />
            </div>

            {/* Password */}
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

            {/* Role */}
            <div className="space-y-2">
              <Label>Role</Label>
              <div className="grid grid-cols-2 gap-2">
                {(["super_admin", "user"] as const).map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, role: r, locationIds: r === "super_admin" ? [] : f.locationIds }))}
                    className={`flex items-center gap-2 p-3 rounded-xl border text-sm font-medium transition-colors ${form.role === r ? "bg-primary/10 border-primary text-primary" : "border-border text-muted-foreground hover:bg-secondary"}`}
                  >
                    {r === "super_admin" ? <ShieldCheck className="w-4 h-4" /> : <User className="w-4 h-4" />}
                    {r === "super_admin" ? "Super Admin" : "User"}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {form.role === "super_admin"
                  ? "Full access to all locations and features. No location restriction needed."
                  : "Restricted access — assign locations below."}
              </p>
            </div>

            {/* Location assignment — only for non-super-admin */}
            {form.role === "user" && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-pink-400" />
                  Assigned Locations
                </Label>
                {loadingPerms ? (
                  <div className="flex items-center justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
                ) : locations.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No locations available. Create locations first.</p>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {locations.map(loc => {
                      const selected = form.locationIds.includes(loc.id);
                      return (
                        <button
                          key={loc.id}
                          type="button"
                          onClick={() => toggleLocation(loc.id)}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-sm font-medium text-left transition-colors ${
                            selected
                              ? "bg-pink-500/10 border-pink-500/40 text-foreground"
                              : "border-border text-muted-foreground hover:bg-secondary"
                          }`}
                        >
                          <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${selected ? "bg-pink-500 border-pink-500" : "border-border"}`}>
                            {selected && <Check className="w-3 h-3 text-white" />}
                          </div>
                          <span className="flex-1 truncate">{loc.name}</span>
                          <span className="text-xs text-muted-foreground font-mono">{loc.code}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
                {form.locationIds.length === 0 && (
                  <p className="text-xs text-amber-400">No locations selected — this user won't see any data after login.</p>
                )}
              </div>
            )}

            {/* Actions */}
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
    </AdminLayout>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface UserRowProps {
  user: AdminUser;
  locations: ApiLocation[];
  authHeaders: Record<string, string>;
  onEdit: () => void;
  onDelete: () => void;
}

function UserRow({ user, locations, authHeaders, onEdit, onDelete }: UserRowProps) {
  const [assignedLocs, setAssignedLocs] = useState<ApiLocation[]>([]);

  useEffect(() => {
    if (user.role === "super_admin") return;
    fetch(`/api/admin/users/${user.id}/permissions`, { headers: authHeaders })
      .then(r => r.json())
      .then((perms: { locationId: number | null }[]) => {
        const ids = [...new Set(perms.map(p => p.locationId).filter((id): id is number => id !== null))];
        setAssignedLocs(locations.filter(l => ids.includes(l.id)));
      })
      .catch(() => {});
  }, [user.id, user.role, locations]);

  return (
    <tr className="hover:bg-secondary/30 transition-colors">
      <td className="px-6 py-4">
        <div className="font-medium">{user.name || user.email}</div>
        {user.name && <div className="text-xs text-muted-foreground mt-0.5">{user.email}</div>}
      </td>
      <td className="px-6 py-4">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${user.role === "super_admin" ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"}`}>
          {user.role === "super_admin" ? <ShieldCheck className="w-3 h-3" /> : <User className="w-3 h-3" />}
          {user.role === "super_admin" ? "Super Admin" : "User"}
        </span>
      </td>
      <td className="px-6 py-4">
        {user.role === "super_admin" ? (
          <span className="text-xs text-muted-foreground italic">All locations</span>
        ) : assignedLocs.length === 0 ? (
          <span className="text-xs text-amber-400/80 italic">No locations</span>
        ) : (
          <div className="flex flex-wrap gap-1">
            {assignedLocs.map(l => (
              <span key={l.id} className="px-2 py-0.5 rounded-full bg-pink-500/10 text-pink-400 text-xs font-medium border border-pink-500/20">
                {l.name}
              </span>
            ))}
          </div>
        )}
      </td>
      <td className="px-6 py-4 text-sm text-muted-foreground">
        {new Date(user.createdAt).toLocaleDateString()}
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="sm" onClick={onEdit}><Pencil className="w-4 h-4" /></Button>
          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={onDelete}><Trash2 className="w-4 h-4" /></Button>
        </div>
      </td>
    </tr>
  );
}

function MobileUserCard({ user, locations, authHeaders, onEdit, onDelete }: UserRowProps) {
  const [assignedLocs, setAssignedLocs] = useState<ApiLocation[]>([]);

  useEffect(() => {
    if (user.role === "super_admin") return;
    fetch(`/api/admin/users/${user.id}/permissions`, { headers: authHeaders })
      .then(r => r.json())
      .then((perms: { locationId: number | null }[]) => {
        const ids = [...new Set(perms.map(p => p.locationId).filter((id): id is number => id !== null))];
        setAssignedLocs(locations.filter(l => ids.includes(l.id)));
      })
      .catch(() => {});
  }, [user.id, user.role, locations]);

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-start gap-3">
        <div className="shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          {user.role === "super_admin" ? <ShieldCheck className="w-5 h-5 text-primary" /> : <User className="w-5 h-5 text-primary" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm truncate">{user.name || user.email}</div>
          {user.name && <p className="text-xs text-muted-foreground truncate">{user.email}</p>}
          <span className={`inline-flex items-center gap-1 mt-1 text-xs px-2 py-0.5 rounded-full ${user.role === "super_admin" ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"}`}>
            {user.role === "super_admin" ? "Super Admin" : "User"}
          </span>
          {/* Location badges */}
          <div className="mt-2">
            {user.role === "super_admin" ? (
              <span className="text-xs text-muted-foreground italic">All locations</span>
            ) : assignedLocs.length === 0 ? (
              <span className="text-xs text-amber-400/80 italic">No locations assigned</span>
            ) : (
              <div className="flex flex-wrap gap-1">
                {assignedLocs.map(l => (
                  <span key={l.id} className="px-2 py-0.5 rounded-full bg-pink-500/10 text-pink-400 text-xs font-medium border border-pink-500/20">
                    {l.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="shrink-0 flex gap-1">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onEdit}><Pencil className="w-4 h-4" /></Button>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive" onClick={onDelete}><Trash2 className="w-4 h-4" /></Button>
        </div>
      </div>
    </div>
  );
}

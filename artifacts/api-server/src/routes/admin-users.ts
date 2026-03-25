/**
 * admin-users.ts — User management routes (super admin only).
 *
 * GET    /api/admin/users                    — list all users
 * POST   /api/admin/users                    — create user
 * PATCH  /api/admin/users/:id               — update email / password / name / role
 * DELETE /api/admin/users/:id               — delete user
 * GET    /api/admin/users/:id/permissions   — list permissions for user
 * PUT    /api/admin/users/:id/permissions   — replace all permissions for user
 */

import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { db, adminUsersTable, userPermissionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireSuperAdmin, requireAuth } from "./auth";

const router: IRouter = Router();

// ── List all users (super admin only) ─────────────────────────────────────────
router.get("/admin/users", requireSuperAdmin, async (_req, res): Promise<void> => {
  const users = await db
    .select({ id: adminUsersTable.id, email: adminUsersTable.email, name: adminUsersTable.name, role: adminUsersTable.role, createdAt: adminUsersTable.createdAt })
    .from(adminUsersTable)
    .orderBy(adminUsersTable.createdAt);
  res.json(users);
});

// ── Create user (super admin only) ────────────────────────────────────────────
router.post("/admin/users", requireSuperAdmin, async (req, res): Promise<void> => {
  const { email, password, name, role } = req.body as { email?: string; password?: string; name?: string; role?: string };

  if (!email?.trim() || !password?.trim()) {
    res.status(400).json({ error: "email and password are required" });
    return;
  }

  const validRole = role === "user" ? "user" : "super_admin";
  const passwordHash = await bcrypt.hash(password, 10);

  try {
    const [user] = await db
      .insert(adminUsersTable)
      .values({ email: email.trim().toLowerCase(), passwordHash, name: name?.trim() || null, role: validRole })
      .returning({ id: adminUsersTable.id, email: adminUsersTable.email, name: adminUsersTable.name, role: adminUsersTable.role });
    res.status(201).json(user);
  } catch (err: any) {
    if (err.code === "23505") {
      res.status(409).json({ error: "A user with that email already exists" });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

// ── Update user (super admin only) ────────────────────────────────────────────
router.patch("/admin/users/:id", requireSuperAdmin, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const { email, password, name, role } = req.body as { email?: string; password?: string; name?: string; role?: string };

  const update: Record<string, any> = {};
  if (email?.trim())    update.email        = email.trim().toLowerCase();
  if (name !== undefined) update.name       = name?.trim() || null;
  if (role === "user" || role === "super_admin") update.role = role;
  if (password?.trim()) update.passwordHash = await bcrypt.hash(password, 10);

  if (Object.keys(update).length === 0) {
    res.status(400).json({ error: "Nothing to update" });
    return;
  }

  const [updated] = await db
    .update(adminUsersTable)
    .set(update)
    .where(eq(adminUsersTable.id, id))
    .returning({ id: adminUsersTable.id, email: adminUsersTable.email, name: adminUsersTable.name, role: adminUsersTable.role });

  if (!updated) { res.status(404).json({ error: "User not found" }); return; }
  res.json(updated);
});

// ── Delete user (super admin only) ────────────────────────────────────────────
router.delete("/admin/users/:id", requireSuperAdmin, async (req: any, res): Promise<void> => {
  const id = Number(req.params.id);
  if (id === req.adminUser.id) {
    res.status(400).json({ error: "Cannot delete your own account" });
    return;
  }
  await db.delete(userPermissionsTable).where(eq(userPermissionsTable.userId, id));
  const [deleted] = await db.delete(adminUsersTable).where(eq(adminUsersTable.id, id)).returning({ id: adminUsersTable.id });
  if (!deleted) { res.status(404).json({ error: "User not found" }); return; }
  res.json({ success: true });
});

// ── Get permissions for a user ─────────────────────────────────────────────────
router.get("/admin/users/:id/permissions", requireSuperAdmin, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const perms = await db.select().from(userPermissionsTable).where(eq(userPermissionsTable.userId, id));
  res.json(perms);
});

// ── Replace all permissions for a user ────────────────────────────────────────
// Body: { permissions: [{ locationId, activityId? }] }
router.put("/admin/users/:id/permissions", requireSuperAdmin, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const { permissions } = req.body as { permissions?: { locationId?: number | null; activityId?: number | null }[] };

  await db.delete(userPermissionsTable).where(eq(userPermissionsTable.userId, id));

  if (permissions?.length) {
    const rows = permissions.map(p => ({
      userId: id,
      locationId: p.locationId ?? null,
      activityId: p.activityId ?? null,
    }));
    await db.insert(userPermissionsTable).values(rows);
  }

  const updated = await db.select().from(userPermissionsTable).where(eq(userPermissionsTable.userId, id));
  res.json(updated);
});

// ── Self-service: update own credentials (any authenticated user) ──────────────
router.patch("/admin/users/me/credentials", requireAuth, async (req: any, res): Promise<void> => {
  const id = req.adminUser.id;
  const { email, password, name } = req.body as { email?: string; password?: string; name?: string };

  const update: Record<string, any> = {};
  if (email?.trim())      update.email        = email.trim().toLowerCase();
  if (name !== undefined) update.name         = name?.trim() || null;
  if (password?.trim())   update.passwordHash = await bcrypt.hash(password, 10);

  if (Object.keys(update).length === 0) {
    res.status(400).json({ error: "Nothing to update" });
    return;
  }

  const [updated] = await db
    .update(adminUsersTable)
    .set(update)
    .where(eq(adminUsersTable.id, id))
    .returning({ id: adminUsersTable.id, email: adminUsersTable.email, name: adminUsersTable.name, role: adminUsersTable.role });

  res.json(updated);
});

export default router;

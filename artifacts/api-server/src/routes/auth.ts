import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db, adminUsersTable, userPermissionsTable } from "@workspace/db";
import { eq, isNull } from "drizzle-orm";
import { AdminLoginBody, AdminLoginResponse, AdminLogoutResponse, GetAuthMeResponse } from "@workspace/api-zod";

const router: IRouter = Router();

const JWT_SECRET = process.env.JWT_SECRET || "urban-arena-secret-key-change-in-prod";

export function verifyToken(token: string): { id: number; email: string; role: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { id: number; email: string; role: string };
  } catch {
    return null;
  }
}

export function requireAuth(req: any, res: any, next: any): void {
  const authHeader = req.headers.authorization as string | undefined;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const token = authHeader.slice(7);
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: "Invalid token" });
    return;
  }
  req.adminUser = payload;
  next();
}

/** Only super_admin users may call this route.
 *  Backward-compatible: tokens issued before the role field was added
 *  have no role claim; we treat those as super_admin. */
export function requireSuperAdmin(req: any, res: any, next: any): void {
  requireAuth(req, res, () => {
    const effectiveRole = req.adminUser?.role ?? "super_admin";
    if (effectiveRole !== "super_admin") {
      res.status(403).json({ error: "Forbidden: super admin only" });
      return;
    }
    next();
  });
}

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = AdminLoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { email, password } = parsed.data;
  const [user] = await db.select().from(adminUsersTable).where(eq(adminUsersTable.email, email));

  if (!user) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const role = user.role ?? "super_admin";
  const token = jwt.sign({ id: user.id, email: user.email, role }, JWT_SECRET, { expiresIn: "7d" });

  res.json(AdminLoginResponse.parse({ user: { id: user.id, email: user.email }, token }));
});

router.post("/auth/logout", (_req, res): void => {
  res.json(AdminLogoutResponse.parse({ success: true }));
});

router.get("/auth/me", requireAuth, async (req: any, res): Promise<void> => {
  const [user] = await db.select().from(adminUsersTable).where(eq(adminUsersTable.id, req.adminUser.id));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const effectiveRole = user.role ?? "super_admin";

  // For non-super-admins, return the unique set of location IDs they have access to.
  // A permission row with activityId = null means "all activities at that location".
  // Rows with a specific activityId are a subset — the location is still accessible.
  let assignedLocationIds: number[] = [];
  if (effectiveRole !== "super_admin") {
    const perms = await db
      .select({ locationId: userPermissionsTable.locationId })
      .from(userPermissionsTable)
      .where(eq(userPermissionsTable.userId, user.id));
    const ids = perms
      .map(p => p.locationId)
      .filter((id): id is number => id !== null && id !== undefined);
    assignedLocationIds = [...new Set(ids)];
  }

  res.json({
    id: user.id,
    email: user.email,
    name: user.name ?? null,
    role: effectiveRole,
    assignedLocationIds, // empty for super_admin (means "all")
  });
});

export default router;

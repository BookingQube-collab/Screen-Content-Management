import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db, adminUsersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { AdminLoginBody, AdminLoginResponse, AdminLogoutResponse, GetAuthMeResponse } from "@workspace/api-zod";

const router: IRouter = Router();

const JWT_SECRET = process.env.JWT_SECRET || "urban-arena-secret-key-change-in-prod";

export function verifyToken(token: string): { id: number; email: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { id: number; email: string };
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

  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: "7d" });

  res.json(AdminLoginResponse.parse({ user: { id: user.id, email: user.email }, token }));
});

router.post("/auth/logout", (_req, res): void => {
  res.json(AdminLogoutResponse.parse({ success: true }));
});

router.get("/auth/me", requireAuth, async (req: any, res): Promise<void> => {
  res.json(GetAuthMeResponse.parse({ id: req.adminUser.id, email: req.adminUser.email }));
});

export default router;

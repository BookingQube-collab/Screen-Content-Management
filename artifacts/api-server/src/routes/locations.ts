import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { locationsTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { requireAuth } from "./auth";

const router: IRouter = Router();

router.get("/admin/locations", requireAuth, async (_req, res): Promise<void> => {
  const rows = await db.select().from(locationsTable).orderBy(asc(locationsTable.name));
  res.json(rows);
});

router.post("/admin/locations", requireAuth, async (req, res): Promise<void> => {
  const { name, code, address, isActive } = req.body;
  if (!name || !code) { res.status(400).json({ error: "name and code are required" }); return; }
  const [row] = await db.insert(locationsTable).values({
    name: String(name),
    code: String(code),
    address: address ? String(address) : null,
    isActive: isActive !== undefined ? Boolean(isActive) : true,
  }).returning();
  res.status(201).json(row);
});

router.patch("/admin/locations/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const updates: Record<string, unknown> = {};
  const { name, code, address, isActive } = req.body;
  if (name     !== undefined) updates.name     = String(name);
  if (code     !== undefined) updates.code     = String(code);
  if (address  !== undefined) updates.address  = address ? String(address) : null;
  if (isActive !== undefined) updates.isActive = Boolean(isActive);
  if (!Object.keys(updates).length) { res.status(400).json({ error: "No fields to update" }); return; }
  const [row] = await db.update(locationsTable).set(updates).where(eq(locationsTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(row);
});

router.delete("/admin/locations/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(locationsTable).where(eq(locationsTable.id, id));
  res.json({ success: true });
});

export default router;

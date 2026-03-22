import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { screensTable, locationsTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { requireAuth } from "./auth";

const router: IRouter = Router();

router.get("/admin/screens", requireAuth, async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      id:           screensTable.id,
      name:         screensTable.name,
      code:         screensTable.code,
      locationId:   screensTable.locationId,
      locationName: locationsTable.name,
      moduleType:   screensTable.moduleType,
      orientation:  screensTable.orientation,
      isActive:     screensTable.isActive,
      notes:        screensTable.notes,
      createdAt:    screensTable.createdAt,
      updatedAt:    screensTable.updatedAt,
    })
    .from(screensTable)
    .leftJoin(locationsTable, eq(screensTable.locationId, locationsTable.id))
    .orderBy(asc(screensTable.name));
  res.json(rows);
});

router.post("/admin/screens", requireAuth, async (req, res): Promise<void> => {
  const { name, code, locationId, moduleType, orientation, isActive, notes } = req.body;
  if (!name || !code) { res.status(400).json({ error: "name and code are required" }); return; }
  const [row] = await db.insert(screensTable).values({
    name:        String(name),
    code:        String(code),
    locationId:  locationId ? parseInt(locationId) : null,
    moduleType:  moduleType  ? String(moduleType)  : "activity-screen",
    orientation: orientation ? String(orientation) : "landscape",
    isActive:    isActive !== undefined ? Boolean(isActive) : true,
    notes:       notes ? String(notes) : null,
  }).returning();
  res.status(201).json(row);
});

router.patch("/admin/screens/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const updates: Record<string, unknown> = {};
  const { name, code, locationId, moduleType, orientation, isActive, notes } = req.body;
  if (name        !== undefined) updates.name        = String(name);
  if (code        !== undefined) updates.code        = String(code);
  if (locationId  !== undefined) updates.locationId  = locationId ? parseInt(locationId) : null;
  if (moduleType  !== undefined) updates.moduleType  = String(moduleType);
  if (orientation !== undefined) updates.orientation = String(orientation);
  if (isActive    !== undefined) updates.isActive    = Boolean(isActive);
  if (notes       !== undefined) updates.notes       = notes ? String(notes) : null;
  if (!Object.keys(updates).length) { res.status(400).json({ error: "No fields to update" }); return; }
  const [row] = await db.update(screensTable).set(updates).where(eq(screensTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(row);
});

router.delete("/admin/screens/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(screensTable).where(eq(screensTable.id, id));
  res.json({ success: true });
});

export default router;

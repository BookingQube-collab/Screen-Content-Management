import { Router, type IRouter } from "express";
import { db, settingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { ListSettingsResponse, UpsertSettingBody, UpsertSettingResponse } from "@workspace/api-zod";
import { requireAuth } from "./auth";
import { broadcast } from "../lib/eventBus";

const router: IRouter = Router();

router.get("/settings", async (_req, res): Promise<void> => {
  const settings = await db.select().from(settingsTable);
  res.json(ListSettingsResponse.parse(settings));
});

router.post("/settings", requireAuth, async (req, res): Promise<void> => {
  const parsed = UpsertSettingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { key, value } = parsed.data;

  const existing = await db.select().from(settingsTable).where(eq(settingsTable.key, key));

  let setting;
  if (existing.length > 0) {
    [setting] = await db
      .update(settingsTable)
      .set({ value })
      .where(eq(settingsTable.key, key))
      .returning();
  } else {
    [setting] = await db
      .insert(settingsTable)
      .values({ key, value })
      .returning();
  }

  broadcast("content-updated");
  res.json(UpsertSettingResponse.parse(setting));
});

export default router;

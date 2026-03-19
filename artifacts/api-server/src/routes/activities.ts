import { Router, type IRouter } from "express";
import { db, activitiesTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import {
  ListActivitiesResponse,
  ListDisplayActivitiesResponse,
  GetActivityParams,
  GetActivityResponse,
  UpdateActivityParams,
  UpdateActivityBody,
  UpdateActivityResponse,
  DeleteActivityParams,
  CreateActivityBody,
  ReorderActivityParams,
  ReorderActivityBody,
  ReorderActivityResponse,
} from "@workspace/api-zod";
import { requireAuth } from "./auth";

const router: IRouter = Router();

router.get("/activities/display", async (_req, res): Promise<void> => {
  const activities = await db
    .select()
    .from(activitiesTable)
    .where(eq(activitiesTable.isActive, true))
    .orderBy(asc(activitiesTable.sortOrder));
  res.json(ListDisplayActivitiesResponse.parse(activities));
});

router.get("/activities", requireAuth, async (_req, res): Promise<void> => {
  const activities = await db
    .select()
    .from(activitiesTable)
    .orderBy(asc(activitiesTable.sortOrder));
  res.json(ListActivitiesResponse.parse(activities));
});

router.post("/activities/create", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateActivityBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [activity] = await db.insert(activitiesTable).values({
    name: parsed.data.name,
    slug: parsed.data.slug,
    shortDescription: parsed.data.shortDescription ?? null,
    fullDescription: parsed.data.fullDescription ?? null,
    ageLimit: parsed.data.ageLimit ?? 18,
    termsAndConditions: parsed.data.termsAndConditions ?? null,
    heroImageUrl: parsed.data.heroImageUrl ?? null,
    heroVideoUrl: parsed.data.heroVideoUrl ?? null,
    cardImageUrl: parsed.data.cardImageUrl ?? null,
    thumbnailUrl: parsed.data.thumbnailUrl ?? null,
    isActive: parsed.data.isActive ?? true,
    isFeatured: parsed.data.isFeatured ?? false,
    sortOrder: parsed.data.sortOrder ?? 0,
    ctaText: parsed.data.ctaText ?? "Explore Now",
  }).returning();

  res.status(201).json(GetActivityResponse.parse(activity));
});

router.get("/activities/:id", async (req, res): Promise<void> => {
  const params = GetActivityParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [activity] = await db.select().from(activitiesTable).where(eq(activitiesTable.id, params.data.id));
  if (!activity) {
    res.status(404).json({ error: "Activity not found" });
    return;
  }

  res.json(GetActivityResponse.parse(activity));
});

router.patch("/activities/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateActivityParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateActivityBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, any> = {};
  const body = parsed.data;
  if (body.name !== undefined) updateData.name = body.name;
  if (body.slug !== undefined) updateData.slug = body.slug;
  if (body.shortDescription !== undefined) updateData.shortDescription = body.shortDescription;
  if (body.fullDescription !== undefined) updateData.fullDescription = body.fullDescription;
  if (body.ageLimit !== undefined) updateData.ageLimit = body.ageLimit;
  if (body.termsAndConditions !== undefined) updateData.termsAndConditions = body.termsAndConditions;
  if (body.heroImageUrl !== undefined) updateData.heroImageUrl = body.heroImageUrl;
  if (body.heroVideoUrl !== undefined) updateData.heroVideoUrl = body.heroVideoUrl;
  if (body.cardImageUrl !== undefined) updateData.cardImageUrl = body.cardImageUrl;
  if (body.thumbnailUrl !== undefined) updateData.thumbnailUrl = body.thumbnailUrl;
  if (body.isActive !== undefined) updateData.isActive = body.isActive;
  if (body.isFeatured !== undefined) updateData.isFeatured = body.isFeatured;
  if (body.sortOrder !== undefined) updateData.sortOrder = body.sortOrder;
  if (body.ctaText !== undefined) updateData.ctaText = body.ctaText;

  const [activity] = await db
    .update(activitiesTable)
    .set(updateData)
    .where(eq(activitiesTable.id, params.data.id))
    .returning();

  if (!activity) {
    res.status(404).json({ error: "Activity not found" });
    return;
  }

  res.json(UpdateActivityResponse.parse(activity));
});

router.delete("/activities/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteActivityParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db
    .delete(activitiesTable)
    .where(eq(activitiesTable.id, params.data.id))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Activity not found" });
    return;
  }

  res.sendStatus(204);
});

router.patch("/activities/:id/reorder", requireAuth, async (req, res): Promise<void> => {
  const params = ReorderActivityParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = ReorderActivityBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [activity] = await db
    .update(activitiesTable)
    .set({ sortOrder: parsed.data.sortOrder })
    .where(eq(activitiesTable.id, params.data.id))
    .returning();

  if (!activity) {
    res.status(404).json({ error: "Activity not found" });
    return;
  }

  res.json(ReorderActivityResponse.parse(activity));
});

export default router;

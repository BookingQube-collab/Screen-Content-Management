import { Router, type IRouter } from "express";
import { db, activitiesTable } from "@workspace/db";
import { eq, asc, and, or, isNull, gte, lte } from "drizzle-orm";
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

router.get("/activities/display", async (req, res): Promise<void> => {
  const screenId   = req.query.screenId   ? parseInt(req.query.screenId as string)   : null;
  const locationId = req.query.locationId ? parseInt(req.query.locationId as string) : null;

  const now = new Date();

  let activities = await db
    .select()
    .from(activitiesTable)
    .where(eq(activitiesTable.isActive, true))
    .orderBy(asc(activitiesTable.sortOrder));

  // Filter by validity window if dates are set
  activities = activities.filter(a => {
    if (a.validFrom && new Date(a.validFrom) > now) return false;
    if (a.validTo   && new Date(a.validTo)   < now) return false;
    return true;
  });

  // If a screen/location filter is requested, show only activities assigned
  // to that screen/location OR activities with no assignment (show everywhere)
  if (screenId !== null || locationId !== null) {
    activities = activities.filter(a => {
      const hasAssignment = a.screenId !== null || a.locationId !== null;
      if (!hasAssignment) return true; // unassigned = show everywhere
      if (screenId   !== null && a.screenId   === screenId)   return true;
      if (locationId !== null && a.locationId === locationId) return true;
      return false;
    });
  }

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
    logoUrl: parsed.data.logoUrl ?? null,
    heroImageUrl: parsed.data.heroImageUrl ?? null,
    heroVideoUrl: parsed.data.heroVideoUrl ?? null,
    cardImageUrl: parsed.data.cardImageUrl ?? null,
    thumbnailUrl: parsed.data.thumbnailUrl ?? null,
    heroGalleryUrls: parsed.data.heroGalleryUrls ?? null,
    isActive: parsed.data.isActive ?? true,
    isFeatured: parsed.data.isFeatured ?? false,
    hideInfo: parsed.data.hideInfo ?? false,
    sortOrder: parsed.data.sortOrder ?? 0,
    ctaText: parsed.data.ctaText ?? "Explore Now",
    locationId: parsed.data.locationId ?? null,
    screenId: parsed.data.screenId ?? null,
    moduleType: parsed.data.moduleType ?? null,
    isOfflineEnabled: parsed.data.isOfflineEnabled ?? false,
    validFrom: parsed.data.validFrom ? new Date(parsed.data.validFrom) : null,
    validTo:   parsed.data.validTo   ? new Date(parsed.data.validTo)   : null,
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
  if (body.name              !== undefined) updateData.name              = body.name;
  if (body.slug              !== undefined) updateData.slug              = body.slug;
  if (body.shortDescription  !== undefined) updateData.shortDescription  = body.shortDescription;
  if (body.fullDescription   !== undefined) updateData.fullDescription   = body.fullDescription;
  if (body.ageLimit          !== undefined) updateData.ageLimit          = body.ageLimit;
  if (body.termsAndConditions!== undefined) updateData.termsAndConditions= body.termsAndConditions;
  if (body.logoUrl           !== undefined) updateData.logoUrl           = body.logoUrl;
  if (body.heroImageUrl      !== undefined) updateData.heroImageUrl      = body.heroImageUrl;
  if (body.heroVideoUrl      !== undefined) updateData.heroVideoUrl      = body.heroVideoUrl;
  if (body.cardImageUrl      !== undefined) updateData.cardImageUrl      = body.cardImageUrl;
  if (body.thumbnailUrl      !== undefined) updateData.thumbnailUrl      = body.thumbnailUrl;
  if (body.heroGalleryUrls   !== undefined) updateData.heroGalleryUrls   = body.heroGalleryUrls;
  if (body.isActive          !== undefined) updateData.isActive          = body.isActive;
  if (body.isFeatured        !== undefined) updateData.isFeatured        = body.isFeatured;
  if (body.hideInfo          !== undefined) updateData.hideInfo          = body.hideInfo;
  if (body.sortOrder         !== undefined) updateData.sortOrder         = body.sortOrder;
  if (body.ctaText           !== undefined) updateData.ctaText           = body.ctaText;
  if (body.locationId        !== undefined) updateData.locationId        = body.locationId;
  if (body.screenId          !== undefined) updateData.screenId          = body.screenId;
  if (body.moduleType        !== undefined) updateData.moduleType        = body.moduleType;
  if (body.isOfflineEnabled  !== undefined) updateData.isOfflineEnabled  = body.isOfflineEnabled;
  if (body.validFrom         !== undefined) updateData.validFrom         = body.validFrom ? new Date(body.validFrom) : null;
  if (body.validTo           !== undefined) updateData.validTo           = body.validTo   ? new Date(body.validTo)   : null;

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

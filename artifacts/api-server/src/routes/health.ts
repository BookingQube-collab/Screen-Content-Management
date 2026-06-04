import { Router, type IRouter, type Response } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { isDatabaseConfigured } from "@workspace/db";
import { logger } from "../lib/logger";

const router: IRouter = Router();

let healthDbLogged = false;
function sendHealth(res: Response): void {
  if (!healthDbLogged && isDatabaseConfigured()) {
    healthDbLogged = true;
    logger.info({ databaseConfigured: true }, "health: database env present");
  }
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json({
    ...data,
    database: isDatabaseConfigured() ? "configured" : "not_configured",
  });
}

router.get("/health", (_req, res) => {
  sendHealth(res);
});

router.get("/healthz", (_req, res) => {
  sendHealth(res);
});

export default router;

import { Router, type IRouter, type Response } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { isDatabaseConfigured } from "@workspace/db";

const router: IRouter = Router();

function sendHealth(res: Response): void {
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

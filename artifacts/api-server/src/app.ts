import type { IncomingMessage, ServerResponse } from "http";
import express, { type Express, type Request, type Response } from "express";
import cors from "cors";
import { pinoHttp } from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { HealthCheckResponse } from "@workspace/api-zod";
import { isDatabaseConfigured } from "@workspace/db";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req: IncomingMessage) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res: ServerResponse) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (_req: Request, res: Response) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json({
    ...data,
    database: isDatabaseConfigured() ? "configured" : "not_configured",
  });
});

app.use("/api", router);

logger.info(
  {
    nodeEnv: process.env.NODE_ENV,
    databaseConfigured: isDatabaseConfigured(),
    vercel: Boolean(process.env.VERCEL),
  },
  "API app initialized",
);

export default app;

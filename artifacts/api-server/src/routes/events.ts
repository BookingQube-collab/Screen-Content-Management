/**
 * events.ts — Server-Sent Events endpoint.
 *
 * GET /api/events
 *   Keeps the connection open and streams content-update events.
 *   No auth required — only event names are sent, no sensitive data.
 */

import { Router, type IRouter } from "express";
import { addClient, removeClient } from "../lib/eventBus";

const router: IRouter = Router();

router.get("/events", (req, res): void => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  res.write(": connected\n\n");

  addClient(res);

  const keepAlive = setInterval(() => {
    try {
      res.write(": ping\n\n");
    } catch {
      clearInterval(keepAlive);
    }
  }, 25_000);

  req.on("close", () => {
    clearInterval(keepAlive);
    removeClient(res);
  });
});

export default router;

/**
 * eventBus.ts — Lightweight in-process SSE broadcaster.
 *
 * Any route that mutates display content calls `broadcast("content-updated")`.
 * The display page holds an open SSE connection to /api/events and refetches
 * immediately on receipt — zero manual refresh needed.
 */

import type { Response } from "express";

const clients = new Set<Response>();

export function addClient(res: Response): void {
  clients.add(res);
}

export function removeClient(res: Response): void {
  clients.delete(res);
}

export function broadcast(event: string, data: string = "{}"): void {
  const payload = `event: ${event}\ndata: ${data}\n\n`;
  for (const res of clients) {
    try {
      res.write(payload);
    } catch {
      clients.delete(res);
    }
  }
}

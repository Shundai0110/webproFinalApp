import { randomUUID } from "node:crypto";
import { env } from "../config/env.js";
import { AppError } from "../errors/AppError.js";
import { ephemeralStore } from "../lib/ephemeralStore.js";

const CLIENT_TIMEOUT_MS = 90_000;
const MAX_ACTIVE_CLIENTS = 200;
const clients = new Map<string, number>();

function sweepExpiredClients() {
  if (env.storageMode !== "ephemeral") return;
  const hadClients = clients.size > 0;
  const cutoff = Date.now() - CLIENT_TIMEOUT_MS;
  clients.forEach((lastSeen, clientId) => {
    if (lastSeen < cutoff) clients.delete(clientId);
  });
  if (hadClients && clients.size === 0) ephemeralStore.reset();
}

const sweepTimer = setInterval(sweepExpiredClients, 30_000);
sweepTimer.unref();

export function openDemoClient() {
  sweepExpiredClients();
  if (clients.size >= MAX_ACTIVE_CLIENTS) {
    throw new AppError(503, "DEMO_BUSY", "デモの同時接続上限に達しました");
  }
  const clientId = randomUUID();
  clients.set(clientId, Date.now());
  return {
    clientId,
    storageMode: env.storageMode,
    resetPolicy:
      env.storageMode === "ephemeral"
        ? "最後のブラウザ終了時、90秒の通信断、またはサービス停止時に初期化"
        : "MySQLへ永続化",
    database: env.storageMode === "ephemeral" ? ephemeralStore.stats() : { mode: "mysql" },
  };
}

export function heartbeatDemoClient(clientId: string) {
  sweepExpiredClients();
  if (!clients.has(clientId)) return false;
  clients.set(clientId, Date.now());
  return true;
}

export function closeDemoClient(clientId: string) {
  const removed = clients.delete(clientId);
  if (removed && clients.size === 0 && env.storageMode === "ephemeral") {
    ephemeralStore.reset();
  }
  return { closed: removed, activeClients: clients.size };
}

export function resetEphemeralDemo() {
  if (env.storageMode !== "ephemeral") return { reset: false, storageMode: env.storageMode };
  // 共有中のデータを一利用者が消さないよう、手動初期化は単独接続時だけ許可する。
  sweepExpiredClients();
  if (clients.size > 1) {
    throw new AppError(
      409,
      "DEMO_IN_USE",
      "他のブラウザが利用中のため、一時データベースを初期化できません",
    );
  }
  ephemeralStore.reset();
  return { reset: true, storageMode: env.storageMode, database: ephemeralStore.stats() };
}

export function closeEphemeralDatabase() {
  clearInterval(sweepTimer);
  if (env.storageMode === "ephemeral") ephemeralStore.close();
}

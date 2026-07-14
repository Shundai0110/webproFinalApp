import { createServer } from "node:http";
import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./lib/prisma.js";
import { closeEphemeralDatabase } from "./services/ephemeralLifecycle.js";

const app = createApp();
const server = createServer(app);
let activePort = env.port;
let attemptedPorts = 0;

server.on("listening", () => {
  console.log(`Keio Book demo listening on http://${env.host}:${activePort} (${env.storageMode})`);
});

server.on("error", (error: NodeJS.ErrnoException) => {
  const canTryNextPort =
    env.nodeEnv !== "production" && error.code === "EADDRINUSE" && attemptedPorts < 10;
  if (!canTryNextPort) throw error;

  const previousPort = activePort;
  activePort += 1;
  attemptedPorts += 1;
  console.warn(`${previousPort}番ポートは使用中です。${activePort}番ポートで再試行します。`);
  server.listen(activePort, env.host);
});

server.listen(activePort, env.host);

async function shutdown() {
  server.close(async () => {
    closeEphemeralDatabase();
    if (env.storageMode === "mysql") await prisma.$disconnect();
    process.exit(0);
  });
}

process.once("SIGTERM", shutdown);
process.once("SIGINT", shutdown);

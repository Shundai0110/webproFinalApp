import "dotenv/config";

const storageMode = process.env.DEMO_STORAGE_MODE === "mysql" ? "mysql" : "ephemeral";

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number.parseInt(process.env.PORT ?? "4000", 10),
  host: process.env.HOST ?? "0.0.0.0",
  frontendOrigin: process.env.FRONTEND_ORIGIN ?? "http://127.0.0.1:4173",
  databaseUrl:
    process.env.DATABASE_URL ?? "mysql://demo:demo@127.0.0.1:3306/keio_book_demo",
  demoMode: process.env.DEMO_MODE !== "false",
  storageMode,
  serveFrontend: process.env.SERVE_FRONTEND !== "false",
  sessionSecret:
    process.env.SESSION_SECRET ?? "local-demo-session-secret-change-before-production",
};

export type StorageMode = typeof env.storageMode;

if (
  env.nodeEnv === "production" &&
  env.sessionSecret === "local-demo-session-secret-change-before-production"
) {
  throw new Error("SESSION_SECRET must be configured in production");
}

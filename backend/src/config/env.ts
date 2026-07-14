import "dotenv/config";

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number.parseInt(process.env.PORT ?? "4000", 10),
  frontendOrigin: process.env.FRONTEND_ORIGIN ?? "http://127.0.0.1:4173",
  databaseUrl:
    process.env.DATABASE_URL ?? "mysql://demo:demo@127.0.0.1:3306/keio_book_demo",
  demoMode: process.env.DEMO_MODE !== "false",
  sessionSecret:
    process.env.SESSION_SECRET ?? "local-demo-session-secret-change-before-production",
};

if (
  env.nodeEnv === "production" &&
  env.sessionSecret === "local-demo-session-secret-change-before-production"
) {
  throw new Error("SESSION_SECRET must be configured in production");
}

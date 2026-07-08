import "dotenv/config";

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number.parseInt(process.env.PORT ?? "4000", 10),
  frontendOrigin: process.env.FRONTEND_ORIGIN ?? "http://127.0.0.1:4173",
  demoMode: process.env.DEMO_MODE !== "false",
};

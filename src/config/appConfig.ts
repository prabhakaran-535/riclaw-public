import { config as loadDotEnv } from "dotenv";
import { z } from "zod";

loadDotEnv();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().default("./riclaw.sqlite"),
  JOBS_ROOT_PATH: z.string().default("./jobs"),
  PROJECTS_ROOT_PATH: z.string().default("./apps"),
  TELEGRAM_BOT_TOKEN: z.string().min(1),
  TELEGRAM_WEBHOOK_SECRET: z.string().min(1).default("change-me"),
  TELEGRAM_WEBHOOK_URL: z.string().optional(),
  BOOTSTRAP_OWNER_TELEGRAM_USER_ID: z.string().optional(),
  TELEGRAM_ACCESS_MODE: z.enum(["audit", "enforce"]).default("audit"),
  VERCEL_TOKEN: z.string().min(1),
  VERCEL_TEAM_ID: z.string().optional(),
  VERCEL_PROJECT_NAME_PREFIX: z.string().default("riclaw"),
  VERCEL_COMMAND: z.string().default("vercel"),
  VERCEL_DEPLOY_TARGET: z.enum(["preview", "prod"]).default("preview"),
  CODEX_COMMAND: z.string().default("codex"),
  CODEX_EXECUTION_MODE: z.enum(["cli", "api"]).default("cli"),
  CODEX_EXEC_TIMEOUT_MS: z.coerce.number().int().positive().default(10 * 60 * 1000),
  MAX_REPAIR_ATTEMPTS: z.coerce.number().int().positive().default(3)
});

export type AppConfig = z.infer<typeof envSchema>;

export function loadAppConfig(source: NodeJS.ProcessEnv = process.env): AppConfig {
  return envSchema.parse(source);
}

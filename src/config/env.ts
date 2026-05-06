import { loadAppConfig, type AppConfig } from "./appConfig.js";

export type { AppConfig } from "./appConfig.js";

export const env: AppConfig = loadAppConfig();

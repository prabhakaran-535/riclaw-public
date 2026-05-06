import { loadAppConfig, type AppConfig } from "../config/appConfig.js";
import { AppShell } from "../kernel/appShell.js";
import { authAccessModule } from "./modules/authAccessModule.js";
import { generationRuntimeModule } from "./modules/generationRuntimeModule.js";
import { integrationsCodexModule } from "./modules/integrationsCodexModule.js";
import { integrationsTelegramModule } from "./modules/integrationsTelegramModule.js";
import { integrationsVercelModule } from "./modules/integrationsVercelModule.js";
import { jobsOrchestrationModule } from "./modules/jobsOrchestrationModule.js";
import { storageProjectsModule } from "./modules/storageProjectsModule.js";
import { storageSqliteModule } from "./modules/storageSqliteModule.js";
import { transportHttpModule } from "./modules/transportHttpModule.js";
import { transportTelegramModule } from "./modules/transportTelegramModule.js";
import type { RiclawServices } from "./services.js";

const modules = [
  storageSqliteModule,
  storageProjectsModule,
  authAccessModule,
  integrationsTelegramModule,
  integrationsCodexModule,
  integrationsVercelModule,
  generationRuntimeModule,
  jobsOrchestrationModule,
  transportTelegramModule,
  transportHttpModule
] as const;

export function createRiclawAppShell(config: AppConfig = loadAppConfig()): AppShell<RiclawServices> {
  return new AppShell<RiclawServices>({
    modules,
    configure(container) {
      container.registerValue("config", config);
    }
  });
}

import { DeployService } from "../../core/deployment/deployService.js";
import { LiveVerifier } from "../../core/deployment/liveVerifier.js";
import { VercelClient } from "../../integrations/vercel/vercelClient.js";
import type { AppModuleDefinition } from "../../kernel/contracts.js";
import type { RiclawServices } from "../services.js";

export const integrationsVercelModule: AppModuleDefinition<RiclawServices> = {
  id: "integrations.vercel",
  name: "Vercel Integration",
  dependencies: [],
  register(container) {
    container.registerSingleton("vercelClient", (runtime) => new VercelClient(runtime.resolve("config")));
    container.registerSingleton("deployService", (runtime) => new DeployService(runtime.resolve("vercelClient")));
    container.registerSingleton("liveVerifier", () => new LiveVerifier());
  }
};

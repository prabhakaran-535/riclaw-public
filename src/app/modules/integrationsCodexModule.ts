import { CodexClient } from "../../integrations/codex/codexClient.js";
import type { AppModuleDefinition } from "../../kernel/contracts.js";
import type { RiclawServices } from "../services.js";

export const integrationsCodexModule: AppModuleDefinition<RiclawServices> = {
  id: "integrations.codex",
  name: "Codex Integration",
  dependencies: [],
  register(container) {
    container.registerSingleton("codexClient", (runtime) => new CodexClient(runtime.resolve("config")));
  }
};

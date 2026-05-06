import { TelegramNotifier } from "../../core/notifications/telegramNotifier.js";
import { TelegramClient } from "../../integrations/telegram/telegramClient.js";
import type { AppModuleDefinition } from "../../kernel/contracts.js";
import type { RiclawServices } from "../services.js";

export const integrationsTelegramModule: AppModuleDefinition<RiclawServices> = {
  id: "integrations.telegram",
  name: "Telegram Integration",
  dependencies: [],
  register(container) {
    container.registerSingleton("telegramClient", (runtime) => new TelegramClient(runtime.resolve("config")));
    container.registerSingleton("telegramNotifier", (runtime) => new TelegramNotifier(runtime.resolve("telegramClient")));
  }
};

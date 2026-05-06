import { TelegramBot } from "../../core/telegram/telegramBot.js";
import { TelegramAdminUseCases, TelegramBuildUseCases } from "../../core/telegram/telegramUseCases.js";
import type { AppModuleDefinition } from "../../kernel/contracts.js";
import type { RiclawServices } from "../services.js";

export const transportTelegramModule: AppModuleDefinition<RiclawServices> = {
  id: "transport.telegram",
  name: "Telegram Transport",
  dependencies: ["integrations.telegram", "jobs.orchestration", "auth.access"],
  register(container) {
    container.registerSingleton("telegramBuildUseCases", (runtime) => {
      return new TelegramBuildUseCases(
        runtime.resolve("accessControl"),
        runtime.resolve("jobManager"),
        runtime.resolve("jobQueue"),
        runtime.resolve("jobRunner"),
        runtime.resolve("projectManager"),
        runtime.resolve("pendingEditRequestRepository"),
        runtime.resolve("pendingRollbackRequestRepository"),
        runtime.resolve("telegramMessageReferenceRepository")
      );
    });
    container.registerSingleton("telegramAdminUseCases", (runtime) => {
      return new TelegramAdminUseCases(runtime.resolve("accessControl"));
    });
    container.registerSingleton("telegramBot", (runtime) => {
      return new TelegramBot(
        runtime.resolve("telegramClient"),
        runtime.resolve("telegramBuildUseCases"),
        runtime.resolve("telegramAdminUseCases")
      );
    });
  }
};

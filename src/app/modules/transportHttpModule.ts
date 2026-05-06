import express from "express";
import { errorHandler } from "../middleware/errorHandler.js";
import { createVerifyTelegramWebhook } from "../middleware/verifyTelegramWebhook.js";
import { createAdminRouter } from "../routes/admin.js";
import { healthRouter } from "../routes/health.js";
import { createTelegramWebhookRouter } from "../routes/telegramWebhook.js";
import type { AppModuleDefinition } from "../../kernel/contracts.js";
import type { RiclawServices } from "../services.js";

export const transportHttpModule: AppModuleDefinition<RiclawServices> = {
  id: "transport.http",
  name: "HTTP Transport",
  dependencies: ["transport.telegram", "jobs.orchestration"],
  register(container) {
    container.registerSingleton("httpApp", (runtime) => {
      const app = express();
      const config = runtime.resolve("config");

      app.use(express.json());
      app.use("/health", healthRouter);
      app.use(
        "/telegram",
        createTelegramWebhookRouter(runtime.resolve("telegramBot"), createVerifyTelegramWebhook(config))
      );
      app.use("/admin", createAdminRouter(runtime.resolve("jobManager")));
      app.use(errorHandler);

      return app;
    });
  }
};

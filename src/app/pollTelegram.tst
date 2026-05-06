import { setTimeout as delay } from "node:timers/promises";
import { createRiclawAppShell } from "./createAppShell.js";
import { logger } from "../shared/logger.js";

async function main(): Promise<void> {
  const appShell = createRiclawAppShell();
  await appShell.start();
  const telegramClient = appShell.resolve("telegramClient");
  const telegramBot = appShell.resolve("telegramBot");
  let offset: number | undefined;

  while (true) {
    try {
      const updates = await telegramClient.getUpdates(offset);
      for (const update of updates) {
        offset = update.update_id + 1;
        const callbackQuery = telegramClient.normalizeCallbackQueryUpdate(update);
        if (callbackQuery) {
          await telegramBot.handleCallbackQuery(callbackQuery);
          continue;
        }
        const message = telegramClient.normalizeMessageUpdate(update);
        if (!message) {
          continue;
        }
        await telegramBot.handleMessage(message);
      }
    } catch (error) {
      logger.error("Telegram poll iteration failed.", {
        error: error instanceof Error ? error.message : String(error)
      });
    }

    await delay(3000);
  }
}

void main().catch((error) => {
  logger.error("Telegram polling failed.", { error: error instanceof Error ? error.message : String(error) });
  process.exit(1);
});

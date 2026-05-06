import { loadAppConfig } from "../config/appConfig.js";
import { TelegramClient } from "../integrations/telegram/telegramClient.js";
import { logger } from "../shared/logger.js";

async function main(): Promise<void> {
  const telegramClient = new TelegramClient(loadAppConfig());
  await telegramClient.deleteWebhook();
  logger.info("Telegram webhook deleted.");
}

void main().catch((error) => {
  logger.error("Failed to delete Telegram webhook.", {
    error: error instanceof Error ? error.message : String(error)
  });
  process.exit(1);
});

import { loadAppConfig } from "../config/appConfig.js";
import { TelegramClient } from "../integrations/telegram/telegramClient.js";
import { logger } from "../shared/logger.js";

async function main(): Promise<void> {
  const config = loadAppConfig();
  if (!config.TELEGRAM_WEBHOOK_URL) {
    throw new Error("TELEGRAM_WEBHOOK_URL must be set before registering the Telegram webhook.");
  }

  const telegramClient = new TelegramClient(config);
  await telegramClient.setWebhook(
    `${config.TELEGRAM_WEBHOOK_URL}/telegram/webhook`,
    config.TELEGRAM_WEBHOOK_SECRET
  );
  const info = await telegramClient.getWebhookInfo();
  logger.info("Telegram webhook registered.", info);
}

void main().catch((error) => {
  logger.error("Failed to register Telegram webhook.", {
    error: error instanceof Error ? error.message : String(error)
  });
  process.exit(1);
});

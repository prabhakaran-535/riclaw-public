import type { NextFunction, Request, Response } from "express";
import type { AppConfig } from "../../config/appConfig.js";

export function createVerifyTelegramWebhook(
  config: Pick<AppConfig, "TELEGRAM_WEBHOOK_SECRET">
): (req: Request, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    const secret = req.header("x-telegram-bot-api-secret-token");
    if (secret !== config.TELEGRAM_WEBHOOK_SECRET) {
      res.status(401).json({ error: "Invalid Telegram webhook secret." });
      return;
    }

    next();
  };
}

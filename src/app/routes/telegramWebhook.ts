import type { RequestHandler } from "express";
import { Router } from "express";
import type { TelegramBot } from "../../core/telegram/telegramBot.js";

export function createTelegramWebhookRouter(
  telegramBot: TelegramBot,
  verifyTelegramWebhook: RequestHandler
): Router {
  const router = Router();

  router.post("/webhook", verifyTelegramWebhook, async (req, res, next) => {
    try {
      const message = req.body?.message?.text && req.body?.message?.from
        ? {
            chatId: String(req.body.message.chat.id),
            messageId: Number(req.body.message.message_id),
            replyToMessageId: req.body.message.reply_to_message?.message_id
              ? Number(req.body.message.reply_to_message.message_id)
              : undefined,
            userId: String(req.body.message.from.id),
            username: req.body.message.from.username,
            text: String(req.body.message.text)
          }
        : null;
      const callbackQuery = req.body?.callback_query?.data && req.body?.callback_query?.from && req.body?.callback_query?.message
        ? {
            id: String(req.body.callback_query.id),
            chatId: String(req.body.callback_query.message.chat.id),
            messageId: Number(req.body.callback_query.message.message_id),
            userId: String(req.body.callback_query.from.id),
            username: req.body.callback_query.from.username,
            data: String(req.body.callback_query.data)
          }
        : null;

      if (!message && !callbackQuery) {
        res.status(200).json({ ignored: true });
        return;
      }

      const result = message
        ? await telegramBot.handleMessage(message)
        : await telegramBot.handleCallbackQuery(callbackQuery!);
      res.status(result.jobId ? 202 : 200).json({ accepted: true, jobId: result.jobId });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

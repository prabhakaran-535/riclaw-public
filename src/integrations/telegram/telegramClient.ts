import type { AppConfig } from "../../config/appConfig.js";
import type {
  TelegramCallbackQuery,
  TelegramMessage,
  TelegramSendMessageOptions,
  TelegramSentMessage
} from "./telegramTypes.js";

type TelegramReplyMarkup = {
  keyboard?: Array<Array<{ text: string }>>;
  inline_keyboard?: Array<Array<{ text: string; callback_data: string }>>;
  resize_keyboard?: boolean;
  one_time_keyboard?: boolean;
  remove_keyboard?: boolean;
};

type TelegramUpdate = {
  update_id: number;
  message?: {
    message_id: number;
    text?: string;
    chat: { id: number | string };
    from?: { id: number | string; username?: string };
    reply_to_message?: {
      message_id: number;
    };
  };
  callback_query?: {
    id: string;
    data?: string;
    from?: { id: number | string; username?: string };
    message?: {
      message_id: number;
      chat: { id: number | string };
    };
  };
};

export class TelegramClient {
  private readonly apiBase: string;

  constructor(config: AppConfig) {
    this.apiBase = `https://api.telegram.org/bot${config.TELEGRAM_BOT_TOKEN}`;
  }

  private buildReplyMarkup(options?: TelegramSendMessageOptions): TelegramReplyMarkup | undefined {
    if (!options) {
      return undefined;
    }

    if (options.removeKeyboard) {
      return { remove_keyboard: true };
    }

    if (options.inlineButtons?.length) {
      return {
        inline_keyboard: [
          options.inlineButtons.map((button) => ({
            text: button.text,
            callback_data: button.callbackData
          }))
        ]
      };
    }

    if (!options.keyboardLabels?.length) {
      return undefined;
    }

    return {
      keyboard: options.keyboardLabels.map((label) => [{ text: label }]),
      resize_keyboard: options.resizeKeyboard ?? true,
      one_time_keyboard: options.oneTimeKeyboard ?? false
    };
  }

  private async request<T>(method: string, body?: Record<string, unknown>, query?: Record<string, string>): Promise<T> {
    const url = new URL(`${this.apiBase}/${method}`);
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        url.searchParams.set(key, value);
      }
    }

    const response = await fetch(url, {
      method: body ? "POST" : "GET",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined
    });

    const data = (await response.json()) as { ok?: boolean; description?: string; result?: T };
    if (!response.ok || !data.ok) {
      throw new Error(data.description ?? `Telegram request failed for ${method}.`);
    }

    return data.result as T;
  }

  async sendMessage(chatId: string, text: string, options?: TelegramSendMessageOptions): Promise<TelegramSentMessage> {
    const result = await this.request<{ message_id: number; chat: { id: number | string } }>("sendMessage", {
      chat_id: chatId,
      text,
      reply_markup: this.buildReplyMarkup(options),
      reply_to_message_id: options?.replyToMessageId
    });
    return {
      chatId: String(result.chat.id),
      messageId: result.message_id
    };
  }

  async getUpdates(offset?: number): Promise<TelegramUpdate[]> {
    return this.request<TelegramUpdate[]>("getUpdates", undefined, offset ? { offset: String(offset) } : undefined);
  }

  async answerCallbackQuery(callbackQueryId: string, text?: string): Promise<boolean> {
    return this.request<boolean>("answerCallbackQuery", {
      callback_query_id: callbackQueryId,
      text
    });
  }

  async setWebhook(url: string, secretToken: string): Promise<boolean> {
    return this.request<boolean>("setWebhook", {
      url,
      secret_token: secretToken,
      allowed_updates: ["message", "callback_query"]
    });
  }

  async deleteWebhook(): Promise<boolean> {
    return this.request<boolean>("deleteWebhook");
  }

  async getWebhookInfo(): Promise<Record<string, unknown>> {
    return this.request<Record<string, unknown>>("getWebhookInfo");
  }

  normalizeMessageUpdate(update: TelegramUpdate): TelegramMessage | null {
    if (!update.message?.text || !update.message.from) {
      return null;
    }

    return {
      chatId: String(update.message.chat.id),
      messageId: update.message.message_id,
      replyToMessageId: update.message.reply_to_message?.message_id,
      userId: String(update.message.from.id),
      username: update.message.from.username,
      text: update.message.text
    };
  }

  normalizeCallbackQueryUpdate(update: TelegramUpdate): TelegramCallbackQuery | null {
    if (!update.callback_query?.data || !update.callback_query.from || !update.callback_query.message) {
      return null;
    }

    return {
      id: update.callback_query.id,
      chatId: String(update.callback_query.message.chat.id),
      messageId: update.callback_query.message.message_id,
      userId: String(update.callback_query.from.id),
      username: update.callback_query.from.username,
      data: update.callback_query.data
    };
  }
}

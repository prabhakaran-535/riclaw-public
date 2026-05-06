import type { TelegramClient } from "../../integrations/telegram/telegramClient.js";
import type { TelegramSentMessage } from "../../integrations/telegram/telegramTypes.js";

export class TelegramNotifier {
  constructor(private readonly telegramClient: TelegramClient) {}

  async sendProgress(chatId: string, message: string): Promise<TelegramSentMessage> {
    return this.telegramClient.sendMessage(chatId, message);
  }

  async sendCompletion(input: {
    chatId: string;
    appName: string;
    deploymentUrl: string;
    projectId: string;
    revisionNumber: number;
    slug: string;
  }): Promise<TelegramSentMessage> {
    return this.telegramClient.sendMessage(
      input.chatId,
      [
        `Your app "${input.appName}" is ready.`,
        input.deploymentUrl,
        "",
        `Project ID: ${input.projectId}`,
        `Slug: ${input.slug}`,
        `Revision: ${input.revisionNumber}`
      ].join("\n")
    );
  }

  async sendClarification(chatId: string, question: string, options: string[]): Promise<TelegramSentMessage> {
    return this.telegramClient.sendMessage(chatId, question, {
      keyboardLabels: options,
      resizeKeyboard: true,
      oneTimeKeyboard: true
    });
  }
}

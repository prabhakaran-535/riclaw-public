import type { TelegramMessageReference } from "./telegramMessageReferenceTypes.js";

export type CreateTelegramMessageReferenceInput = {
  kind: TelegramMessageReference["kind"];
  chatId: string;
  messageId: number;
  projectId: string;
  revisionId: string;
};

export interface TelegramMessageReferenceRepository {
  create(input: CreateTelegramMessageReferenceInput): TelegramMessageReference;
  findByChatAndMessage(chatId: string, messageId: number): TelegramMessageReference | null;
}

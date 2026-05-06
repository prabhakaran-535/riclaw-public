export type TelegramMessageReferenceKind = "delivery";

export type TelegramMessageReference = {
  id: string;
  kind: TelegramMessageReferenceKind;
  chatId: string;
  messageId: number;
  projectId: string;
  revisionId: string;
  createdAt: string;
  updatedAt: string;
};

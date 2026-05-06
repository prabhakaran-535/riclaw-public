export type TelegramMessage = {
  chatId: string;
  messageId: number;
  replyToMessageId?: number;
  userId: string;
  username?: string;
  text: string;
};

export type TelegramCallbackQuery = {
  id: string;
  chatId: string;
  messageId: number;
  userId: string;
  username?: string;
  data: string;
};

export type TelegramSentMessage = {
  chatId: string;
  messageId: number;
};

export type TelegramSendMessageOptions = {
  keyboardLabels?: string[];
  inlineButtons?: Array<{ text: string; callbackData: string }>;
  resizeKeyboard?: boolean;
  oneTimeKeyboard?: boolean;
  removeKeyboard?: boolean;
  replyToMessageId?: number;
};

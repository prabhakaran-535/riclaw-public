import { createId } from "../../shared/ids.js";
import type { DbClient } from "../client.js";
import type {
  CreateTelegramMessageReferenceInput,
  TelegramMessageReferenceRepository
} from "../../core/telegram/telegramMessageReferenceRepository.js";
import type { TelegramMessageReference } from "../../core/telegram/telegramMessageReferenceTypes.js";

function mapTelegramMessageReference(row: Record<string, unknown>): TelegramMessageReference {
  return {
    id: String(row.id),
    kind: row.kind as TelegramMessageReference["kind"],
    chatId: String(row.chat_id),
    messageId: Number(row.message_id),
    projectId: String(row.project_id),
    revisionId: String(row.revision_id),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at)
  };
}

export class SQLiteTelegramMessageReferenceRepository implements TelegramMessageReferenceRepository {
  constructor(private readonly dbClient: DbClient) {}

  create(input: CreateTelegramMessageReferenceInput): TelegramMessageReference {
    const now = new Date().toISOString();
    const reference: TelegramMessageReference = {
      id: createId("tmr"),
      kind: input.kind,
      chatId: input.chatId,
      messageId: input.messageId,
      projectId: input.projectId,
      revisionId: input.revisionId,
      createdAt: now,
      updatedAt: now
    };

    this.dbClient
      .getDatabase()
      .prepare(
        `INSERT INTO telegram_message_references (
          id, kind, chat_id, message_id, project_id, revision_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        reference.id,
        reference.kind,
        reference.chatId,
        reference.messageId,
        reference.projectId,
        reference.revisionId,
        reference.createdAt,
        reference.updatedAt
      );

    return reference;
  }

  findByChatAndMessage(chatId: string, messageId: number): TelegramMessageReference | null {
    const row = this.dbClient
      .getDatabase()
      .prepare("SELECT * FROM telegram_message_references WHERE chat_id = ? AND message_id = ? LIMIT 1")
      .get(chatId, messageId) as Record<string, unknown> | undefined;
    return row ? mapTelegramMessageReference(row) : null;
  }
}

import type { DbClient } from "../client.js";
import type {
  AuthorizedUserRecord,
  AuthorizedUserRepository,
  UpsertAuthorizedUserInput
} from "../../core/auth/authorizedUserRepository.js";

function mapAuthorizedUser(row: Record<string, unknown>): AuthorizedUserRecord {
  return {
    telegramUserId: String(row.telegram_user_id),
    telegramUsername: row.telegram_username ? String(row.telegram_username) : undefined,
    role: String(row.role) as "owner" | "builder",
    status: String(row.status) as "active" | "revoked",
    addedBy: row.added_by ? String(row.added_by) : undefined,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at)
  };
}

export class SQLiteAuthorizedUserRepository implements AuthorizedUserRepository {
  constructor(private readonly dbClient: DbClient) {}

  list(): AuthorizedUserRecord[] {
    const rows = this.dbClient
      .getDatabase()
      .prepare("SELECT * FROM authorized_users ORDER BY created_at ASC")
      .all() as Array<Record<string, unknown>>;
    return rows.map(mapAuthorizedUser);
  }

  getByTelegramUserId(telegramUserId: string): AuthorizedUserRecord | null {
    const row = this.dbClient
      .getDatabase()
      .prepare("SELECT * FROM authorized_users WHERE telegram_user_id = ?")
      .get(telegramUserId) as Record<string, unknown> | undefined;

    return row ? mapAuthorizedUser(row) : null;
  }

  upsert(input: UpsertAuthorizedUserInput): void {
    const now = new Date().toISOString();
    const existing = this.getByTelegramUserId(input.telegramUserId);

    this.dbClient
      .getDatabase()
      .prepare(
        `INSERT INTO authorized_users (
          telegram_user_id, telegram_username, role, status, added_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(telegram_user_id) DO UPDATE SET
          telegram_username = excluded.telegram_username,
          role = excluded.role,
          status = excluded.status,
          added_by = excluded.added_by,
          updated_at = excluded.updated_at`
      )
      .run(
        input.telegramUserId,
        input.telegramUsername ?? existing?.telegramUsername ?? null,
        input.role,
        input.status,
        input.addedBy ?? existing?.addedBy ?? null,
        existing?.createdAt ?? now,
        now
      );
  }
}

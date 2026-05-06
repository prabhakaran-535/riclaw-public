export type AuthorizedUserRecord = {
  telegramUserId: string;
  telegramUsername?: string;
  role: "owner" | "builder";
  status: "active" | "revoked";
  addedBy?: string;
  createdAt: string;
  updatedAt: string;
};

export type UpsertAuthorizedUserInput = {
  telegramUserId: string;
  telegramUsername?: string;
  role: "owner" | "builder";
  status: "active" | "revoked";
  addedBy?: string;
};

export interface AuthorizedUserRepository {
  list(): AuthorizedUserRecord[];
  getByTelegramUserId(telegramUserId: string): AuthorizedUserRecord | null;
  upsert(input: UpsertAuthorizedUserInput): void;
}

import type { AppConfig } from "../../config/appConfig.js";
import type { AuthorizedUserRecord, AuthorizedUserRepository } from "./authorizedUserRepository.js";
import { logger } from "../../shared/logger.js";

export type AuthorizedUser = AuthorizedUserRecord;

export class AccessControl {
  constructor(
    private readonly users: AuthorizedUserRepository,
    private readonly config: AppConfig
  ) {}

  ensureBootstrapOwner(): void {
    const ownerId = this.config.BOOTSTRAP_OWNER_TELEGRAM_USER_ID?.trim();
    if (!ownerId) {
      return;
    }

    this.users.upsert({
      telegramUserId: ownerId,
      role: "owner",
      status: "active",
      addedBy: "bootstrap"
    });
  }

  canStartBuild(userId: string): boolean {
    const user = this.users.getByTelegramUserId(userId);
    if (user?.status === "active") {
      return true;
    }

    if (this.config.TELEGRAM_ACCESS_MODE === "audit") {
      logger.info("Telegram access audit: unauthorised user would have been blocked.", {
        userId
      });
      return true;
    }

    return false;
  }

  isOwner(userId: string): boolean {
    const user = this.users.getByTelegramUserId(userId);
    return user?.status === "active" && user.role === "owner";
  }

  allowUser(telegramUserId: string, addedBy: string, role: "owner" | "builder" = "builder"): void {
    this.users.upsert({
      telegramUserId,
      role,
      status: "active",
      addedBy
    });
  }

  revokeUser(telegramUserId: string, addedBy: string): void {
    const current = this.users.getByTelegramUserId(telegramUserId);
    this.users.upsert({
      telegramUserId,
      telegramUsername: current?.telegramUsername,
      role: current?.role ?? "builder",
      status: "revoked",
      addedBy
    });
  }

  listUsers(): AuthorizedUser[] {
    return this.users.list();
  }
}

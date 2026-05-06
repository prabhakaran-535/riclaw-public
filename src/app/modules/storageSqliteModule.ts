import { DbClient } from "../../db/client.js";
import { SQLiteAuthorizedUserRepository } from "../../db/repositories/sqliteAuthorizedUserRepository.js";
import { SQLiteJobRepository } from "../../db/repositories/sqliteJobRepository.js";
import { SQLitePendingEditRequestRepository } from "../../db/repositories/sqlitePendingEditRequestRepository.js";
import { SQLitePendingRollbackRequestRepository } from "../../db/repositories/sqlitePendingRollbackRequestRepository.js";
import { SQLiteProjectRepository } from "../../db/repositories/sqliteProjectRepository.js";
import { SQLiteRevisionRepository } from "../../db/repositories/sqliteRevisionRepository.js";
import { SQLiteTelegramMessageReferenceRepository } from "../../db/repositories/sqliteTelegramMessageReferenceRepository.js";
import type { AppModuleDefinition } from "../../kernel/contracts.js";
import type { RiclawServices } from "../services.js";

export const storageSqliteModule: AppModuleDefinition<RiclawServices> = {
  id: "storage.sqlite",
  name: "SQLite Storage",
  dependencies: [],
  register(container) {
    container.registerSingleton("dbClient", (runtime) => new DbClient(runtime.resolve("config")));
    container.registerSingleton("jobRepository", (runtime) => new SQLiteJobRepository(runtime.resolve("dbClient")));
    container.registerSingleton("projectRepository", (runtime) => new SQLiteProjectRepository(runtime.resolve("dbClient")));
    container.registerSingleton("revisionRepository", (runtime) => new SQLiteRevisionRepository(runtime.resolve("dbClient")));
    container.registerSingleton("pendingEditRequestRepository", (runtime) => {
      return new SQLitePendingEditRequestRepository(runtime.resolve("dbClient"));
    });
    container.registerSingleton("pendingRollbackRequestRepository", (runtime) => {
      return new SQLitePendingRollbackRequestRepository(runtime.resolve("dbClient"));
    });
    container.registerSingleton("telegramMessageReferenceRepository", (runtime) => {
      return new SQLiteTelegramMessageReferenceRepository(runtime.resolve("dbClient"));
    });
    container.registerSingleton("authorizedUserRepository", (runtime) => {
      return new SQLiteAuthorizedUserRepository(runtime.resolve("dbClient"));
    });
    container.onStart((runtime) => {
      runtime.resolve("dbClient").connect();
    });
  }
};

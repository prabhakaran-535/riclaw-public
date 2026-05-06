import type { DbClient } from "../client.js";
import type {
  AppProjectRepository,
  AppProjectPatch,
  CreateAppProjectInput
} from "../../core/projects/projectRepository.js";
import type { AppProject } from "../../core/projects/projectTypes.js";
import { createId } from "../../shared/ids.js";

function mapProject(row: Record<string, unknown>): AppProject {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    chatId: String(row.chat_id),
    appName: String(row.app_name),
    slug: String(row.slug),
    vercelProjectId: String(row.vercel_project_id),
    latestRevisionId: row.latest_revision_id ? String(row.latest_revision_id) : undefined,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at)
  };
}

export class SQLiteProjectRepository implements AppProjectRepository {
  constructor(private readonly dbClient: DbClient) {}

  create(input: CreateAppProjectInput): AppProject {
    const now = new Date().toISOString();
    const project: AppProject = {
      id: input.id ?? createId("app"),
      userId: input.userId,
      chatId: input.chatId,
      appName: input.appName,
      slug: input.slug,
      vercelProjectId: input.vercelProjectId,
      createdAt: now,
      updatedAt: now
    };

    this.dbClient
      .getDatabase()
      .prepare(
        `INSERT INTO app_projects (
          id, user_id, chat_id, app_name, slug, vercel_project_id, latest_revision_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        project.id,
        project.userId,
        project.chatId,
        project.appName,
        project.slug,
        project.vercelProjectId,
        project.latestRevisionId ?? null,
        project.createdAt,
        project.updatedAt
      );

    return project;
  }

  getById(projectId: string): AppProject {
    const row = this.dbClient
      .getDatabase()
      .prepare("SELECT * FROM app_projects WHERE id = ?")
      .get(projectId) as Record<string, unknown> | undefined;
    if (!row) {
      throw new Error(`App project not found: ${projectId}`);
    }

    return mapProject(row);
  }

  findBySlugForUser(userId: string, slug: string): AppProject | null {
    const row = this.dbClient
      .getDatabase()
      .prepare("SELECT * FROM app_projects WHERE user_id = ? AND slug = ? LIMIT 1")
      .get(userId, slug) as Record<string, unknown> | undefined;
    return row ? mapProject(row) : null;
  }

  update(projectId: string, patch: AppProjectPatch): AppProject {
    const current = this.getById(projectId);
    const updated: AppProject = {
      ...current,
      ...patch,
      updatedAt: new Date().toISOString()
    };

    this.dbClient
      .getDatabase()
      .prepare(
        `UPDATE app_projects SET
          user_id = ?,
          chat_id = ?,
          app_name = ?,
          slug = ?,
          vercel_project_id = ?,
          latest_revision_id = ?,
          updated_at = ?
        WHERE id = ?`
      )
      .run(
        updated.userId,
        updated.chatId,
        updated.appName,
        updated.slug,
        updated.vercelProjectId,
        updated.latestRevisionId ?? null,
        updated.updatedAt,
        updated.id
      );

    return updated;
  }

  list(): AppProject[] {
    const rows = this.dbClient
      .getDatabase()
      .prepare("SELECT * FROM app_projects ORDER BY created_at DESC")
      .all() as Record<string, unknown>[];
    return rows.map(mapProject);
  }

  listByUserId(userId: string): AppProject[] {
    const rows = this.dbClient
      .getDatabase()
      .prepare("SELECT * FROM app_projects WHERE user_id = ? ORDER BY created_at DESC")
      .all(userId) as Record<string, unknown>[];
    return rows.map(mapProject);
  }
}

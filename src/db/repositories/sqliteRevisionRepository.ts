import type { DbClient } from "../client.js";
import type {
  AppRevisionRepository,
  AppRevisionPatch,
  CreateAppRevisionInput
} from "../../core/revisions/revisionRepository.js";
import type { AppRevision, RevisionStatus } from "../../core/revisions/revisionTypes.js";
import { createId } from "../../shared/ids.js";

function mapRevision(row: Record<string, unknown>): AppRevision {
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    revisionNumber: Number(row.revision_number),
    sourceJobId: String(row.source_job_id),
    status: String(row.status) as RevisionStatus,
    templateName: row.template_name ? String(row.template_name) : undefined,
    workspacePath: row.workspace_path ? String(row.workspace_path) : undefined,
    deploymentUrl: row.deployment_url ? String(row.deployment_url) : undefined,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at)
  };
}

export class SQLiteRevisionRepository implements AppRevisionRepository {
  constructor(private readonly dbClient: DbClient) {}

  create(input: CreateAppRevisionInput): AppRevision {
    const now = new Date().toISOString();
    const nextRevisionNumberRow = this.dbClient
      .getDatabase()
      .prepare("SELECT COALESCE(MAX(revision_number), 0) AS max_revision_number FROM app_revisions WHERE project_id = ?")
      .get(input.projectId) as { max_revision_number: number };
    const revision: AppRevision = {
      id: createId("rev"),
      projectId: input.projectId,
      revisionNumber: Number(nextRevisionNumberRow.max_revision_number) + 1,
      sourceJobId: input.sourceJobId,
      status: "draft",
      templateName: input.templateName,
      createdAt: now,
      updatedAt: now
    };

    this.dbClient
      .getDatabase()
      .prepare(
        `INSERT INTO app_revisions (
          id, project_id, revision_number, source_job_id, status, template_name, workspace_path, deployment_url, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        revision.id,
        revision.projectId,
        revision.revisionNumber,
        revision.sourceJobId,
        revision.status,
        revision.templateName ?? null,
        revision.workspacePath ?? null,
        revision.deploymentUrl ?? null,
        revision.createdAt,
        revision.updatedAt
      );

    return revision;
  }

  getById(revisionId: string): AppRevision {
    const row = this.dbClient
      .getDatabase()
      .prepare("SELECT * FROM app_revisions WHERE id = ?")
      .get(revisionId) as Record<string, unknown> | undefined;
    if (!row) {
      throw new Error(`App revision not found: ${revisionId}`);
    }

    return mapRevision(row);
  }

  getByProjectAndRevisionNumber(projectId: string, revisionNumber: number): AppRevision | null {
    const row = this.dbClient
      .getDatabase()
      .prepare("SELECT * FROM app_revisions WHERE project_id = ? AND revision_number = ? LIMIT 1")
      .get(projectId, revisionNumber) as Record<string, unknown> | undefined;
    return row ? mapRevision(row) : null;
  }

  update(revisionId: string, patch: AppRevisionPatch): AppRevision {
    const current = this.getById(revisionId);
    const updated: AppRevision = {
      ...current,
      ...patch,
      updatedAt: new Date().toISOString()
    };

    this.dbClient
      .getDatabase()
      .prepare(
        `UPDATE app_revisions SET
          project_id = ?,
          revision_number = ?,
          source_job_id = ?,
          status = ?,
          template_name = ?,
          workspace_path = ?,
          deployment_url = ?,
          updated_at = ?
        WHERE id = ?`
      )
      .run(
        updated.projectId,
        updated.revisionNumber,
        updated.sourceJobId,
        updated.status,
        updated.templateName ?? null,
        updated.workspacePath ?? null,
        updated.deploymentUrl ?? null,
        updated.updatedAt,
        updated.id
      );

    return updated;
  }

  listByProject(projectId: string): AppRevision[] {
    const rows = this.dbClient
      .getDatabase()
      .prepare("SELECT * FROM app_revisions WHERE project_id = ? ORDER BY revision_number DESC")
      .all(projectId) as Record<string, unknown>[];
    return rows.map(mapRevision);
  }

  getLatestForProject(projectId: string): AppRevision | null {
    const row = this.dbClient
      .getDatabase()
      .prepare("SELECT * FROM app_revisions WHERE project_id = ? ORDER BY revision_number DESC LIMIT 1")
      .get(projectId) as Record<string, unknown> | undefined;
    return row ? mapRevision(row) : null;
  }
}

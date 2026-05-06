import type { DbClient } from "../client.js";
import { createId } from "../../shared/ids.js";
import type { JobRepository, CreateJobRecordInput, JobRecordPatch } from "../../core/jobs/jobRepository.js";
import type { JobEvent, JobRecord, JobStatus } from "../../core/jobs/jobTypes.js";

function mapJob(row: Record<string, unknown>): JobRecord {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    chatId: String(row.chat_id),
    rawRequest: String(row.raw_request),
    status: row.status as JobStatus,
    cancellationRequested: Boolean(row.cancellation_requested),
    currentPhase: row.current_phase ? String(row.current_phase) : undefined,
    progressPercent: Number(row.progress_percent ?? 0),
    projectId: row.project_id ? String(row.project_id) : undefined,
    revisionId: row.revision_id ? String(row.revision_id) : undefined,
    baseRevisionId: row.base_revision_id ? String(row.base_revision_id) : undefined,
    workspacePath: row.workspace_path ? String(row.workspace_path) : undefined,
    templateName: row.template_name ? String(row.template_name) : undefined,
    deploymentUrl: row.deployment_url ? String(row.deployment_url) : undefined,
    failureReason: row.failure_reason ? String(row.failure_reason) : undefined,
    clarificationQuestion: row.clarification_question ? String(row.clarification_question) : undefined,
    clarificationOptions: row.clarification_options
      ? (JSON.parse(String(row.clarification_options)) as string[])
      : undefined,
    clarificationStage: row.clarification_stage ? (String(row.clarification_stage) as JobRecord["clarificationStage"]) : undefined,
    queuedAt: row.queued_at ? String(row.queued_at) : String(row.created_at),
    startedAt: row.started_at ? String(row.started_at) : undefined,
    completedAt: row.completed_at ? String(row.completed_at) : undefined,
    failedAt: row.failed_at ? String(row.failed_at) : undefined,
    cancelledAt: row.cancelled_at ? String(row.cancelled_at) : undefined,
    currentStatusAt: row.current_status_at ? String(row.current_status_at) : String(row.updated_at ?? row.created_at),
    currentPhaseStartedAt: row.current_phase_started_at ? String(row.current_phase_started_at) : undefined,
    lastProgressAt: row.last_progress_at ? String(row.last_progress_at) : String(row.updated_at ?? row.created_at),
    estimatedCompletionAt: row.estimated_completion_at ? String(row.estimated_completion_at) : undefined,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at)
  };
}

function mapEvent(row: Record<string, unknown>): JobEvent {
  return {
    id: String(row.id),
    jobId: String(row.job_id),
    stage: row.stage as JobStatus,
    message: String(row.message),
    metadata: row.metadata_json ? (JSON.parse(String(row.metadata_json)) as Record<string, unknown>) : undefined,
    createdAt: String(row.created_at)
  };
}

export class SQLiteJobRepository implements JobRepository {
  constructor(private readonly dbClient: DbClient) {}

  create(input: CreateJobRecordInput): JobRecord {
    const now = new Date().toISOString();
    const job: JobRecord = {
      id: createId("job"),
      userId: input.userId,
      chatId: input.chatId,
      rawRequest: input.rawRequest,
      status: "queued",
      cancellationRequested: false,
      progressPercent: 0,
      projectId: input.projectId,
      revisionId: input.revisionId,
      baseRevisionId: input.baseRevisionId,
      templateName: input.templateName,
      queuedAt: now,
      currentStatusAt: now,
      lastProgressAt: now,
      createdAt: now,
      updatedAt: now
    };

    this.dbClient
      .getDatabase()
      .prepare(
        `INSERT INTO jobs (
          id, user_id, chat_id, raw_request, status, cancellation_requested, current_phase, progress_percent, project_id, revision_id, base_revision_id, workspace_path, template_name,
          deployment_url, failure_reason, clarification_question, clarification_options, clarification_stage, queued_at, started_at, completed_at, failed_at,
          cancelled_at, current_status_at, current_phase_started_at, last_progress_at, estimated_completion_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        job.id,
        job.userId,
        job.chatId,
        job.rawRequest,
        job.status,
        job.cancellationRequested ? 1 : 0,
        job.currentPhase ?? null,
        job.progressPercent,
        job.projectId ?? null,
        job.revisionId ?? null,
        job.baseRevisionId ?? null,
        job.workspacePath ?? null,
        job.templateName ?? null,
        job.deploymentUrl ?? null,
        job.failureReason ?? null,
        job.clarificationQuestion ?? null,
        job.clarificationOptions ? JSON.stringify(job.clarificationOptions) : null,
        job.clarificationStage ?? null,
        job.queuedAt,
        job.startedAt ?? null,
        job.completedAt ?? null,
        job.failedAt ?? null,
        job.cancelledAt ?? null,
        job.currentStatusAt,
        job.currentPhaseStartedAt ?? null,
        job.lastProgressAt,
        job.estimatedCompletionAt ?? null,
        job.createdAt,
        job.updatedAt
      );

    return job;
  }

  getById(jobId: string): JobRecord {
    const row = this.dbClient
      .getDatabase()
      .prepare("SELECT * FROM jobs WHERE id = ?")
      .get(jobId) as Record<string, unknown> | undefined;
    if (!row) {
      throw new Error(`Job not found: ${jobId}`);
    }

    return mapJob(row);
  }

  list(): JobRecord[] {
    const rows = this.dbClient.getDatabase().prepare("SELECT * FROM jobs ORDER BY created_at DESC").all() as Record<string, unknown>[];
    return rows.map(mapJob);
  }

  listByStatuses(statuses: JobStatus[]): JobRecord[] {
    if (statuses.length === 0) {
      return [];
    }

    const placeholders = statuses.map(() => "?").join(", ");
    const rows = this.dbClient
      .getDatabase()
      .prepare(`SELECT * FROM jobs WHERE status IN (${placeholders}) ORDER BY created_at ASC`)
      .all(...statuses) as Record<string, unknown>[];
    return rows.map(mapJob);
  }

  findLatestAwaitingClarification(chatId: string): JobRecord | null {
    const row = this.dbClient
      .getDatabase()
      .prepare("SELECT * FROM jobs WHERE chat_id = ? AND status = 'awaiting_clarification' ORDER BY created_at DESC LIMIT 1")
      .get(chatId) as Record<string, unknown> | undefined;
    return row ? mapJob(row) : null;
  }

  findLatestActive(chatId: string): JobRecord | null {
    const row = this.dbClient
      .getDatabase()
      .prepare(
        `SELECT * FROM jobs
         WHERE chat_id = ?
           AND status IN ('queued', 'awaiting_clarification', 'specifying', 'generating', 'validating', 'repairing', 'deploying', 'verifying', 'cancelling')
         ORDER BY created_at DESC
         LIMIT 1`
      )
      .get(chatId) as Record<string, unknown> | undefined;
    return row ? mapJob(row) : null;
  }

  findLatestActiveByProject(projectId: string): JobRecord | null {
    const row = this.dbClient
      .getDatabase()
      .prepare(
        `SELECT * FROM jobs
         WHERE project_id = ?
           AND status IN ('queued', 'awaiting_clarification', 'specifying', 'generating', 'validating', 'repairing', 'deploying', 'verifying', 'cancelling')
         ORDER BY created_at DESC
         LIMIT 1`
      )
      .get(projectId) as Record<string, unknown> | undefined;
    return row ? mapJob(row) : null;
  }

  findNextQueued(): JobRecord | null {
    const row = this.dbClient
      .getDatabase()
      .prepare("SELECT * FROM jobs WHERE status = 'queued' ORDER BY queued_at ASC, created_at ASC LIMIT 1")
      .get() as Record<string, unknown> | undefined;
    return row ? mapJob(row) : null;
  }

  update(jobId: string, patch: JobRecordPatch): JobRecord {
    const current = this.getById(jobId);
    const updated: JobRecord = {
      ...current,
      ...patch,
      updatedAt: new Date().toISOString()
    };

    this.dbClient
      .getDatabase()
      .prepare(
        `UPDATE jobs SET
          user_id = ?,
          chat_id = ?,
          raw_request = ?,
          status = ?,
          cancellation_requested = ?,
          current_phase = ?,
          progress_percent = ?,
          project_id = ?,
          revision_id = ?,
          base_revision_id = ?,
          workspace_path = ?,
          template_name = ?,
          deployment_url = ?,
          failure_reason = ?,
          clarification_question = ?,
          clarification_options = ?,
          clarification_stage = ?,
          queued_at = ?,
          started_at = ?,
          completed_at = ?,
          failed_at = ?,
          cancelled_at = ?,
          current_status_at = ?,
          current_phase_started_at = ?,
          last_progress_at = ?,
          estimated_completion_at = ?,
          updated_at = ?
        WHERE id = ?`
      )
      .run(
        updated.userId,
        updated.chatId,
        updated.rawRequest,
        updated.status,
        updated.cancellationRequested ? 1 : 0,
        updated.currentPhase ?? null,
        updated.progressPercent,
        updated.projectId ?? null,
        updated.revisionId ?? null,
        updated.baseRevisionId ?? null,
        updated.workspacePath ?? null,
        updated.templateName ?? null,
        updated.deploymentUrl ?? null,
        updated.failureReason ?? null,
        updated.clarificationQuestion ?? null,
        updated.clarificationOptions ? JSON.stringify(updated.clarificationOptions) : null,
        updated.clarificationStage ?? null,
        updated.queuedAt,
        updated.startedAt ?? null,
        updated.completedAt ?? null,
        updated.failedAt ?? null,
        updated.cancelledAt ?? null,
        updated.currentStatusAt,
        updated.currentPhaseStartedAt ?? null,
        updated.lastProgressAt,
        updated.estimatedCompletionAt ?? null,
        updated.updatedAt,
        updated.id
      );

    return updated;
  }

  appendEvent(jobId: string, stage: JobStatus, message: string, metadata?: Record<string, unknown>): JobEvent {
    const event: JobEvent = {
      id: createId("evt"),
      jobId,
      stage,
      message,
      metadata,
      createdAt: new Date().toISOString()
    };

    this.dbClient
      .getDatabase()
      .prepare(
        `INSERT INTO job_events (
          id, job_id, stage, message, metadata_json, created_at
        ) VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(
        event.id,
        event.jobId,
        event.stage,
        event.message,
        event.metadata ? JSON.stringify(event.metadata) : null,
        event.createdAt
      );

    return event;
  }

  listEvents(jobId: string): JobEvent[] {
    const rows = this.dbClient
      .getDatabase()
      .prepare("SELECT * FROM job_events WHERE job_id = ? ORDER BY created_at ASC")
      .all(jobId) as Record<string, unknown>[];
    return rows.map(mapEvent);
  }
}

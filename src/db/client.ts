import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { AppConfig } from "../config/appConfig.js";

export class DbClient {
  private readonly database: DatabaseSync;

  constructor(config: AppConfig) {
    const dbPath = path.resolve(config.DATABASE_URL);
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    this.database = new DatabaseSync(dbPath);
  }

  connect(): void {
    this.database.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS jobs (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        chat_id TEXT NOT NULL,
        raw_request TEXT NOT NULL,
        status TEXT NOT NULL,
        cancellation_requested INTEGER NOT NULL DEFAULT 0,
        current_phase TEXT,
        progress_percent INTEGER NOT NULL DEFAULT 0,
        project_id TEXT,
        revision_id TEXT,
        base_revision_id TEXT,
        workspace_path TEXT,
        template_name TEXT,
        deployment_url TEXT,
        failure_reason TEXT,
        clarification_question TEXT,
        clarification_options TEXT,
        clarification_stage TEXT,
        queued_at TEXT,
        started_at TEXT,
        completed_at TEXT,
        failed_at TEXT,
        cancelled_at TEXT,
        current_status_at TEXT,
        current_phase_started_at TEXT,
        last_progress_at TEXT,
        estimated_completion_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(project_id) REFERENCES app_projects(id),
        FOREIGN KEY(revision_id) REFERENCES app_revisions(id),
        FOREIGN KEY(base_revision_id) REFERENCES app_revisions(id)
      );

      CREATE TABLE IF NOT EXISTS app_projects (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        chat_id TEXT NOT NULL,
        app_name TEXT NOT NULL,
        slug TEXT NOT NULL,
        vercel_project_id TEXT NOT NULL,
        latest_revision_id TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(latest_revision_id) REFERENCES app_revisions(id)
      );

      CREATE TABLE IF NOT EXISTS app_revisions (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        revision_number INTEGER NOT NULL,
        source_job_id TEXT NOT NULL,
        status TEXT NOT NULL,
        template_name TEXT,
        workspace_path TEXT,
        deployment_url TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(project_id) REFERENCES app_projects(id),
        FOREIGN KEY(source_job_id) REFERENCES jobs(id),
        UNIQUE(project_id, revision_number)
      );

      CREATE TABLE IF NOT EXISTS job_events (
        id TEXT PRIMARY KEY,
        job_id TEXT NOT NULL,
        stage TEXT NOT NULL,
        message TEXT NOT NULL,
        metadata_json TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY(job_id) REFERENCES jobs(id)
      );

      CREATE TABLE IF NOT EXISTS authorized_users (
        telegram_user_id TEXT PRIMARY KEY,
        telegram_username TEXT,
        role TEXT NOT NULL,
        status TEXT NOT NULL,
        added_by TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS telegram_message_references (
        id TEXT PRIMARY KEY,
        kind TEXT NOT NULL,
        chat_id TEXT NOT NULL,
        message_id INTEGER NOT NULL,
        project_id TEXT NOT NULL,
        revision_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(project_id) REFERENCES app_projects(id),
        FOREIGN KEY(revision_id) REFERENCES app_revisions(id),
        UNIQUE(chat_id, message_id)
      );

      CREATE TABLE IF NOT EXISTS pending_edit_requests (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        delivery_revision_id TEXT NOT NULL,
        requester_user_id TEXT NOT NULL,
        chat_id TEXT NOT NULL,
        reply_message_id INTEGER NOT NULL,
        requested_change TEXT NOT NULL,
        status TEXT NOT NULL,
        confirmation_message_id INTEGER,
        confirmed_job_id TEXT,
        confirmed_revision_id TEXT,
        confirmed_at TEXT,
        cancelled_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(project_id) REFERENCES app_projects(id),
        FOREIGN KEY(delivery_revision_id) REFERENCES app_revisions(id),
        FOREIGN KEY(confirmed_job_id) REFERENCES jobs(id),
        FOREIGN KEY(confirmed_revision_id) REFERENCES app_revisions(id)
      );

      CREATE TABLE IF NOT EXISTS pending_rollback_requests (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        target_revision_id TEXT NOT NULL,
        requester_user_id TEXT NOT NULL,
        chat_id TEXT NOT NULL,
        requested_revision_number INTEGER NOT NULL,
        status TEXT NOT NULL,
        confirmation_message_id INTEGER,
        confirmed_job_id TEXT,
        confirmed_revision_id TEXT,
        confirmed_at TEXT,
        cancelled_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(project_id) REFERENCES app_projects(id),
        FOREIGN KEY(target_revision_id) REFERENCES app_revisions(id),
        FOREIGN KEY(confirmed_job_id) REFERENCES jobs(id),
        FOREIGN KEY(confirmed_revision_id) REFERENCES app_revisions(id)
      );
    `);

    const jobColumns = this.database.prepare("PRAGMA table_info(jobs)").all() as Array<{ name: string }>;
    const jobColumnNames = new Set(jobColumns.map((column) => column.name));
    if (!jobColumnNames.has("clarification_question")) {
      this.database.exec("ALTER TABLE jobs ADD COLUMN clarification_question TEXT;");
    }
    if (!jobColumnNames.has("clarification_options")) {
      this.database.exec("ALTER TABLE jobs ADD COLUMN clarification_options TEXT;");
    }
    if (!jobColumnNames.has("clarification_stage")) {
      this.database.exec("ALTER TABLE jobs ADD COLUMN clarification_stage TEXT;");
    }
    if (!jobColumnNames.has("cancellation_requested")) {
      this.database.exec("ALTER TABLE jobs ADD COLUMN cancellation_requested INTEGER NOT NULL DEFAULT 0;");
    }
    if (!jobColumnNames.has("project_id")) {
      this.database.exec("ALTER TABLE jobs ADD COLUMN project_id TEXT;");
    }
    if (!jobColumnNames.has("revision_id")) {
      this.database.exec("ALTER TABLE jobs ADD COLUMN revision_id TEXT;");
    }
    if (!jobColumnNames.has("base_revision_id")) {
      this.database.exec("ALTER TABLE jobs ADD COLUMN base_revision_id TEXT;");
    }
    if (!jobColumnNames.has("current_phase")) {
      this.database.exec("ALTER TABLE jobs ADD COLUMN current_phase TEXT;");
    }
    if (!jobColumnNames.has("progress_percent")) {
      this.database.exec("ALTER TABLE jobs ADD COLUMN progress_percent INTEGER NOT NULL DEFAULT 0;");
    }
    if (!jobColumnNames.has("queued_at")) {
      this.database.exec("ALTER TABLE jobs ADD COLUMN queued_at TEXT;");
    }
    if (!jobColumnNames.has("started_at")) {
      this.database.exec("ALTER TABLE jobs ADD COLUMN started_at TEXT;");
    }
    if (!jobColumnNames.has("completed_at")) {
      this.database.exec("ALTER TABLE jobs ADD COLUMN completed_at TEXT;");
    }
    if (!jobColumnNames.has("failed_at")) {
      this.database.exec("ALTER TABLE jobs ADD COLUMN failed_at TEXT;");
    }
    if (!jobColumnNames.has("cancelled_at")) {
      this.database.exec("ALTER TABLE jobs ADD COLUMN cancelled_at TEXT;");
    }
    if (!jobColumnNames.has("current_status_at")) {
      this.database.exec("ALTER TABLE jobs ADD COLUMN current_status_at TEXT;");
    }
    if (!jobColumnNames.has("current_phase_started_at")) {
      this.database.exec("ALTER TABLE jobs ADD COLUMN current_phase_started_at TEXT;");
    }
    if (!jobColumnNames.has("last_progress_at")) {
      this.database.exec("ALTER TABLE jobs ADD COLUMN last_progress_at TEXT;");
    }
    if (!jobColumnNames.has("estimated_completion_at")) {
      this.database.exec("ALTER TABLE jobs ADD COLUMN estimated_completion_at TEXT;");
    }
    this.database.exec(`
      UPDATE jobs
      SET
        status = CASE
          WHEN status = 'received' THEN 'queued'
          ELSE status
        END,
        queued_at = COALESCE(queued_at, created_at),
        current_status_at = COALESCE(current_status_at, updated_at, created_at),
        last_progress_at = COALESCE(last_progress_at, updated_at, created_at),
        progress_percent = COALESCE(progress_percent, 0)
      WHERE
        status = 'received'
        OR queued_at IS NULL
        OR current_status_at IS NULL
        OR last_progress_at IS NULL;
    `);
  }

  getDatabase(): DatabaseSync {
    return this.database;
  }
}

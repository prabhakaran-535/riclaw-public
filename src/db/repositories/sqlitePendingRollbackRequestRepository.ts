import { createId } from "../../shared/ids.js";
import type { DbClient } from "../client.js";
import type {
  CreatePendingRollbackRequestInput,
  PendingRollbackRequestPatch,
  PendingRollbackRequestRepository
} from "../../core/projects/pendingRollbackRequestRepository.js";
import type { PendingRollbackRequest } from "../../core/projects/pendingRollbackRequestTypes.js";

function mapPendingRollbackRequest(row: Record<string, unknown>): PendingRollbackRequest {
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    targetRevisionId: String(row.target_revision_id),
    requesterUserId: String(row.requester_user_id),
    chatId: String(row.chat_id),
    requestedRevisionNumber: Number(row.requested_revision_number),
    status: row.status as PendingRollbackRequest["status"],
    confirmationMessageId: row.confirmation_message_id ? Number(row.confirmation_message_id) : undefined,
    confirmedJobId: row.confirmed_job_id ? String(row.confirmed_job_id) : undefined,
    confirmedRevisionId: row.confirmed_revision_id ? String(row.confirmed_revision_id) : undefined,
    confirmedAt: row.confirmed_at ? String(row.confirmed_at) : undefined,
    cancelledAt: row.cancelled_at ? String(row.cancelled_at) : undefined,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at)
  };
}

export class SQLitePendingRollbackRequestRepository implements PendingRollbackRequestRepository {
  constructor(private readonly dbClient: DbClient) {}

  create(input: CreatePendingRollbackRequestInput): PendingRollbackRequest {
    const now = new Date().toISOString();
    const pendingRollbackRequest: PendingRollbackRequest = {
      id: createId("rbk"),
      projectId: input.projectId,
      targetRevisionId: input.targetRevisionId,
      requesterUserId: input.requesterUserId,
      chatId: input.chatId,
      requestedRevisionNumber: input.requestedRevisionNumber,
      status: "pending_confirmation",
      createdAt: now,
      updatedAt: now
    };

    this.dbClient
      .getDatabase()
      .prepare(
        `INSERT INTO pending_rollback_requests (
          id, project_id, target_revision_id, requester_user_id, chat_id, requested_revision_number, status,
          confirmation_message_id, confirmed_job_id, confirmed_revision_id, confirmed_at, cancelled_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        pendingRollbackRequest.id,
        pendingRollbackRequest.projectId,
        pendingRollbackRequest.targetRevisionId,
        pendingRollbackRequest.requesterUserId,
        pendingRollbackRequest.chatId,
        pendingRollbackRequest.requestedRevisionNumber,
        pendingRollbackRequest.status,
        pendingRollbackRequest.confirmationMessageId ?? null,
        pendingRollbackRequest.confirmedJobId ?? null,
        pendingRollbackRequest.confirmedRevisionId ?? null,
        pendingRollbackRequest.confirmedAt ?? null,
        pendingRollbackRequest.cancelledAt ?? null,
        pendingRollbackRequest.createdAt,
        pendingRollbackRequest.updatedAt
      );

    return pendingRollbackRequest;
  }

  getById(pendingRollbackRequestId: string): PendingRollbackRequest {
    const row = this.dbClient
      .getDatabase()
      .prepare("SELECT * FROM pending_rollback_requests WHERE id = ?")
      .get(pendingRollbackRequestId) as Record<string, unknown> | undefined;
    if (!row) {
      throw new Error(`Pending rollback request not found: ${pendingRollbackRequestId}`);
    }

    return mapPendingRollbackRequest(row);
  }

  update(pendingRollbackRequestId: string, patch: PendingRollbackRequestPatch): PendingRollbackRequest {
    const current = this.getById(pendingRollbackRequestId);
    const updated: PendingRollbackRequest = {
      ...current,
      ...patch,
      updatedAt: new Date().toISOString()
    };

    this.dbClient
      .getDatabase()
      .prepare(
        `UPDATE pending_rollback_requests SET
          project_id = ?,
          target_revision_id = ?,
          requester_user_id = ?,
          chat_id = ?,
          requested_revision_number = ?,
          status = ?,
          confirmation_message_id = ?,
          confirmed_job_id = ?,
          confirmed_revision_id = ?,
          confirmed_at = ?,
          cancelled_at = ?,
          updated_at = ?
        WHERE id = ?`
      )
      .run(
        updated.projectId,
        updated.targetRevisionId,
        updated.requesterUserId,
        updated.chatId,
        updated.requestedRevisionNumber,
        updated.status,
        updated.confirmationMessageId ?? null,
        updated.confirmedJobId ?? null,
        updated.confirmedRevisionId ?? null,
        updated.confirmedAt ?? null,
        updated.cancelledAt ?? null,
        updated.updatedAt,
        updated.id
      );

    return updated;
  }

  findLatestPendingByProject(projectId: string): PendingRollbackRequest | null {
    const row = this.dbClient
      .getDatabase()
      .prepare(
        `SELECT * FROM pending_rollback_requests
         WHERE project_id = ? AND status = 'pending_confirmation'
         ORDER BY created_at DESC
         LIMIT 1`
      )
      .get(projectId) as Record<string, unknown> | undefined;
    return row ? mapPendingRollbackRequest(row) : null;
  }
}

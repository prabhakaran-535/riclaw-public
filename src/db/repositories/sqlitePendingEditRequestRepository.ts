import { createId } from "../../shared/ids.js";
import type { DbClient } from "../client.js";
import type {
  CreatePendingEditRequestInput,
  PendingEditRequestPatch,
  PendingEditRequestRepository
} from "../../core/projects/pendingEditRequestRepository.js";
import type { PendingEditRequest } from "../../core/projects/pendingEditRequestTypes.js";

function mapPendingEditRequest(row: Record<string, unknown>): PendingEditRequest {
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    deliveryRevisionId: String(row.delivery_revision_id),
    requesterUserId: String(row.requester_user_id),
    chatId: String(row.chat_id),
    replyMessageId: Number(row.reply_message_id),
    requestedChange: String(row.requested_change),
    status: row.status as PendingEditRequest["status"],
    confirmationMessageId: row.confirmation_message_id ? Number(row.confirmation_message_id) : undefined,
    confirmedJobId: row.confirmed_job_id ? String(row.confirmed_job_id) : undefined,
    confirmedRevisionId: row.confirmed_revision_id ? String(row.confirmed_revision_id) : undefined,
    confirmedAt: row.confirmed_at ? String(row.confirmed_at) : undefined,
    cancelledAt: row.cancelled_at ? String(row.cancelled_at) : undefined,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at)
  };
}

export class SQLitePendingEditRequestRepository implements PendingEditRequestRepository {
  constructor(private readonly dbClient: DbClient) {}

  create(input: CreatePendingEditRequestInput): PendingEditRequest {
    const now = new Date().toISOString();
    const pendingEditRequest: PendingEditRequest = {
      id: createId("edit"),
      projectId: input.projectId,
      deliveryRevisionId: input.deliveryRevisionId,
      requesterUserId: input.requesterUserId,
      chatId: input.chatId,
      replyMessageId: input.replyMessageId,
      requestedChange: input.requestedChange,
      status: "pending_confirmation",
      createdAt: now,
      updatedAt: now
    };

    this.dbClient
      .getDatabase()
      .prepare(
        `INSERT INTO pending_edit_requests (
          id, project_id, delivery_revision_id, requester_user_id, chat_id, reply_message_id, requested_change,
          status, confirmation_message_id, confirmed_job_id, confirmed_revision_id, confirmed_at, cancelled_at,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        pendingEditRequest.id,
        pendingEditRequest.projectId,
        pendingEditRequest.deliveryRevisionId,
        pendingEditRequest.requesterUserId,
        pendingEditRequest.chatId,
        pendingEditRequest.replyMessageId,
        pendingEditRequest.requestedChange,
        pendingEditRequest.status,
        pendingEditRequest.confirmationMessageId ?? null,
        pendingEditRequest.confirmedJobId ?? null,
        pendingEditRequest.confirmedRevisionId ?? null,
        pendingEditRequest.confirmedAt ?? null,
        pendingEditRequest.cancelledAt ?? null,
        pendingEditRequest.createdAt,
        pendingEditRequest.updatedAt
      );

    return pendingEditRequest;
  }

  getById(pendingEditRequestId: string): PendingEditRequest {
    const row = this.dbClient
      .getDatabase()
      .prepare("SELECT * FROM pending_edit_requests WHERE id = ?")
      .get(pendingEditRequestId) as Record<string, unknown> | undefined;
    if (!row) {
      throw new Error(`Pending edit request not found: ${pendingEditRequestId}`);
    }

    return mapPendingEditRequest(row);
  }

  update(pendingEditRequestId: string, patch: PendingEditRequestPatch): PendingEditRequest {
    const current = this.getById(pendingEditRequestId);
    const updated: PendingEditRequest = {
      ...current,
      ...patch,
      updatedAt: new Date().toISOString()
    };

    this.dbClient
      .getDatabase()
      .prepare(
        `UPDATE pending_edit_requests SET
          project_id = ?,
          delivery_revision_id = ?,
          requester_user_id = ?,
          chat_id = ?,
          reply_message_id = ?,
          requested_change = ?,
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
        updated.deliveryRevisionId,
        updated.requesterUserId,
        updated.chatId,
        updated.replyMessageId,
        updated.requestedChange,
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

  findLatestPendingByProject(projectId: string): PendingEditRequest | null {
    const row = this.dbClient
      .getDatabase()
      .prepare(
        `SELECT * FROM pending_edit_requests
         WHERE project_id = ? AND status = 'pending_confirmation'
         ORDER BY created_at DESC
         LIMIT 1`
      )
      .get(projectId) as Record<string, unknown> | undefined;
    return row ? mapPendingEditRequest(row) : null;
  }
}

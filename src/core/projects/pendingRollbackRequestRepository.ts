import type { PendingRollbackRequest } from "./pendingRollbackRequestTypes.js";

export type CreatePendingRollbackRequestInput = {
  projectId: string;
  targetRevisionId: string;
  requesterUserId: string;
  chatId: string;
  requestedRevisionNumber: number;
};

export type PendingRollbackRequestPatch = Partial<PendingRollbackRequest>;

export interface PendingRollbackRequestRepository {
  create(input: CreatePendingRollbackRequestInput): PendingRollbackRequest;
  getById(pendingRollbackRequestId: string): PendingRollbackRequest;
  update(pendingRollbackRequestId: string, patch: PendingRollbackRequestPatch): PendingRollbackRequest;
  findLatestPendingByProject(projectId: string): PendingRollbackRequest | null;
}

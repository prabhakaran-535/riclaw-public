import type { PendingEditRequest } from "./pendingEditRequestTypes.js";

export type CreatePendingEditRequestInput = {
  projectId: string;
  deliveryRevisionId: string;
  requesterUserId: string;
  chatId: string;
  replyMessageId: number;
  requestedChange: string;
};

export type PendingEditRequestPatch = Partial<PendingEditRequest>;

export interface PendingEditRequestRepository {
  create(input: CreatePendingEditRequestInput): PendingEditRequest;
  getById(pendingEditRequestId: string): PendingEditRequest;
  update(pendingEditRequestId: string, patch: PendingEditRequestPatch): PendingEditRequest;
  findLatestPendingByProject(projectId: string): PendingEditRequest | null;
}

export type PendingRollbackRequestStatus = "pending_confirmation" | "confirmed" | "cancelled";

export type PendingRollbackRequest = {
  id: string;
  projectId: string;
  targetRevisionId: string;
  requesterUserId: string;
  chatId: string;
  requestedRevisionNumber: number;
  status: PendingRollbackRequestStatus;
  confirmationMessageId?: number;
  confirmedJobId?: string;
  confirmedRevisionId?: string;
  confirmedAt?: string;
  cancelledAt?: string;
  createdAt: string;
  updatedAt: string;
};

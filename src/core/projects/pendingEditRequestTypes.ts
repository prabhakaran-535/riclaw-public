export type PendingEditRequestStatus = "pending_confirmation" | "confirmed" | "cancelled";

export type PendingEditRequest = {
  id: string;
  projectId: string;
  deliveryRevisionId: string;
  requesterUserId: string;
  chatId: string;
  replyMessageId: number;
  requestedChange: string;
  status: PendingEditRequestStatus;
  confirmationMessageId?: number;
  confirmedJobId?: string;
  confirmedRevisionId?: string;
  confirmedAt?: string;
  cancelledAt?: string;
  createdAt: string;
  updatedAt: string;
};

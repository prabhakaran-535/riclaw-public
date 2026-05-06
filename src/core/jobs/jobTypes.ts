export type JobStatus =
  | "queued"
  | "awaiting_clarification"
  | "specifying"
  | "rejected"
  | "generating"
  | "validating"
  | "repairing"
  | "deploying"
  | "verifying"
  | "cancelling"
  | "cancelled"
  | "completed"
  | "failed";

export type JobRecord = {
  id: string;
  userId: string;
  chatId: string;
  rawRequest: string;
  status: JobStatus;
  cancellationRequested?: boolean;
  currentPhase?: string;
  progressPercent: number;
  projectId?: string;
  revisionId?: string;
  baseRevisionId?: string;
  workspacePath?: string;
  templateName?: string;
  deploymentUrl?: string;
  failureReason?: string;
  clarificationQuestion?: string;
  clarificationOptions?: string[];
  clarificationStage?: Exclude<JobStatus, "queued" | "awaiting_clarification" | "cancelling" | "cancelled" | "completed" | "failed" | "rejected">;
  queuedAt: string;
  startedAt?: string;
  completedAt?: string;
  failedAt?: string;
  cancelledAt?: string;
  currentStatusAt: string;
  currentPhaseStartedAt?: string;
  lastProgressAt: string;
  estimatedCompletionAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type JobEvent = {
  id: string;
  jobId: string;
  stage: JobStatus;
  message: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
};

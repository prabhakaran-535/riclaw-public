import type { JobStatus } from "./jobTypes.js";

const allowedTransitions: Record<JobStatus, JobStatus[]> = {
  queued: ["specifying", "awaiting_clarification", "cancelled", "failed"],
  awaiting_clarification: ["queued", "cancelled", "failed"],
  specifying: ["awaiting_clarification", "rejected", "generating", "cancelling", "failed"],
  rejected: [],
  generating: ["awaiting_clarification", "validating", "cancelling", "failed"],
  validating: ["awaiting_clarification", "repairing", "deploying", "cancelling", "failed"],
  repairing: ["awaiting_clarification", "validating", "deploying", "cancelling", "failed"],
  deploying: ["awaiting_clarification", "verifying", "cancelling", "failed"],
  verifying: ["awaiting_clarification", "completed", "cancelling", "failed"],
  cancelling: ["cancelled", "failed"],
  cancelled: [],
  completed: [],
  failed: []
};

export function canTransition(from: JobStatus, to: JobStatus): boolean {
  return allowedTransitions[from].includes(to);
}

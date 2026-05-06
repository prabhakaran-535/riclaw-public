import type { JobStatus } from "../jobs/jobTypes.js";

export type ClarificationStage = Exclude<
  JobStatus,
  "queued" | "awaiting_clarification" | "cancelling" | "cancelled" | "completed" | "failed" | "rejected"
>;

export type ClarificationRequest = {
  stage: ClarificationStage;
  question: string;
  options: string[];
};

export class ClarificationRequiredError extends Error {
  readonly clarification: ClarificationRequest;

  constructor(clarification: ClarificationRequest) {
    super(clarification.question);
    this.name = "ClarificationRequiredError";
    this.clarification = clarification;
  }
}

import type { JobEvent, JobRecord, JobStatus } from "./jobTypes.js";

export type CreateJobRecordInput = {
  userId: string;
  chatId: string;
  rawRequest: string;
  projectId?: string;
  revisionId?: string;
  baseRevisionId?: string;
  templateName?: string;
};

export type JobRecordPatch = Partial<JobRecord>;

export interface JobRepository {
  create(input: CreateJobRecordInput): JobRecord;
  getById(jobId: string): JobRecord;
  list(): JobRecord[];
  listByStatuses(statuses: JobStatus[]): JobRecord[];
  findLatestAwaitingClarification(chatId: string): JobRecord | null;
  findLatestActive(chatId: string): JobRecord | null;
  findLatestActiveByProject(projectId: string): JobRecord | null;
  findNextQueued(): JobRecord | null;
  update(jobId: string, patch: JobRecordPatch): JobRecord;
  appendEvent(jobId: string, stage: JobStatus, message: string, metadata?: Record<string, unknown>): JobEvent;
  listEvents(jobId: string): JobEvent[];
}

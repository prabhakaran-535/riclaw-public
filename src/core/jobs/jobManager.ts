import { formatClarificationForRawRequest } from "../clarifications/clarificationSignals.js";
import type { JobRepository } from "./jobRepository.js";
import type { JobEvent, JobRecord, JobStatus } from "./jobTypes.js";
import { canTransition } from "./jobStateMachine.js";

const ACTIVE_JOB_STATUSES: JobStatus[] = [
  "queued",
  "awaiting_clarification",
  "specifying",
  "generating",
  "validating",
  "repairing",
  "deploying",
  "verifying",
  "cancelling"
];

function estimateCompletionAt(startedAt: string | undefined, progressPercent: number): string | undefined {
  if (!startedAt || progressPercent <= 0 || progressPercent >= 100) {
    return undefined;
  }

  const startedMs = new Date(startedAt).getTime();
  const elapsedMs = Date.now() - startedMs;
  if (elapsedMs <= 0) {
    return undefined;
  }

  const estimatedTotalMs = elapsedMs / (progressPercent / 100);
  return new Date(startedMs + estimatedTotalMs).toISOString();
}

export class JobManager {
  constructor(private readonly jobs: JobRepository) {}

  createJob(input: {
    userId: string;
    chatId: string;
    rawRequest: string;
    projectId?: string;
    revisionId?: string;
    baseRevisionId?: string;
    templateName?: string;
  }): JobRecord {
    const job = this.jobs.create(input);
    this.appendEvent(job.id, "queued", "Job queued from Telegram.");
    return job;
  }

  getJob(jobId: string): JobRecord {
    return this.jobs.getById(jobId);
  }

  listJobs(): JobRecord[] {
    return this.jobs.list();
  }

  listJobsByStatuses(statuses: JobStatus[]): JobRecord[] {
    return this.jobs.listByStatuses(statuses);
  }

  findLatestJobAwaitingClarification(chatId: string): JobRecord | null {
    return this.jobs.findLatestAwaitingClarification(chatId);
  }

  findLatestActiveJob(chatId: string): JobRecord | null {
    return this.jobs.findLatestActive(chatId);
  }

  findLatestActiveJobForProject(projectId: string): JobRecord | null {
    return this.jobs.findLatestActiveByProject(projectId);
  }

  findNextQueuedJob(): JobRecord | null {
    return this.jobs.findNextQueued();
  }

  private patchForStatus(current: JobRecord, nextStatus: JobStatus): Partial<JobRecord> {
    const now = new Date().toISOString();
    const basePatch: Partial<JobRecord> = {
      status: nextStatus,
      currentStatusAt: now,
      lastProgressAt: now
    };

    switch (nextStatus) {
      case "queued":
        return {
          ...basePatch,
          progressPercent: current.startedAt ? current.progressPercent : 0,
          queuedAt: current.queuedAt || now,
          currentPhase: undefined,
          currentPhaseStartedAt: undefined,
          estimatedCompletionAt: estimateCompletionAt(current.startedAt, current.progressPercent)
        };
      case "awaiting_clarification":
        return {
          ...basePatch,
          currentPhase: "waiting_for_clarification",
          currentPhaseStartedAt: now
        };
      case "specifying":
        return {
          ...basePatch,
          progressPercent: Math.max(current.progressPercent, 5),
          startedAt: current.startedAt ?? now,
          currentPhase: "extract_spec",
          currentPhaseStartedAt: now,
          estimatedCompletionAt: estimateCompletionAt(current.startedAt ?? now, Math.max(current.progressPercent, 5))
        };
      case "generating":
        return {
          ...basePatch,
          progressPercent: Math.max(current.progressPercent, 20),
          startedAt: current.startedAt ?? now,
          currentPhase: current.currentPhase ?? "scaffold",
          currentPhaseStartedAt: current.currentPhase ? current.currentPhaseStartedAt : now,
          estimatedCompletionAt: estimateCompletionAt(current.startedAt ?? now, Math.max(current.progressPercent, 20))
        };
      case "validating":
        return {
          ...basePatch,
          progressPercent: Math.max(current.progressPercent, 78),
          currentPhase: "validate_workspace",
          currentPhaseStartedAt: now,
          estimatedCompletionAt: estimateCompletionAt(current.startedAt ?? now, Math.max(current.progressPercent, 78))
        };
      case "repairing":
        return {
          ...basePatch,
          progressPercent: Math.max(current.progressPercent, 84),
          currentPhase: "fix_errors",
          currentPhaseStartedAt: now,
          estimatedCompletionAt: estimateCompletionAt(current.startedAt ?? now, Math.max(current.progressPercent, 84))
        };
      case "deploying":
        return {
          ...basePatch,
          progressPercent: Math.max(current.progressPercent, 92),
          currentPhase: "deploy_vercel",
          currentPhaseStartedAt: now,
          estimatedCompletionAt: estimateCompletionAt(current.startedAt ?? now, Math.max(current.progressPercent, 92))
        };
      case "verifying":
        return {
          ...basePatch,
          progressPercent: Math.max(current.progressPercent, 97),
          currentPhase: "verify_live_app",
          currentPhaseStartedAt: now,
          estimatedCompletionAt: estimateCompletionAt(current.startedAt ?? now, Math.max(current.progressPercent, 97))
        };
      case "cancelling":
        return {
          ...basePatch,
          currentPhase: "cancelling",
          currentPhaseStartedAt: now,
          estimatedCompletionAt: undefined
        };
      case "cancelled":
        return {
          ...basePatch,
          cancellationRequested: false,
          cancelledAt: now,
          currentPhase: current.currentPhase,
          estimatedCompletionAt: undefined
        };
      case "completed":
        return {
          ...basePatch,
          cancellationRequested: false,
          progressPercent: 100,
          completedAt: now,
          currentPhase: "completed",
          currentPhaseStartedAt: current.currentPhaseStartedAt ?? now,
          estimatedCompletionAt: undefined
        };
      case "failed":
        return {
          ...basePatch,
          cancellationRequested: false,
          failedAt: now,
          estimatedCompletionAt: undefined
        };
      case "rejected":
        return {
          ...basePatch,
          progressPercent: current.progressPercent,
          estimatedCompletionAt: undefined
        };
    }
  }

  setStatus(jobId: string, nextStatus: JobStatus): JobRecord {
    const job = this.getJob(jobId);
    if (!canTransition(job.status, nextStatus)) {
      throw new Error(`Invalid transition from ${job.status} to ${nextStatus}`);
    }

    return this.jobs.update(jobId, this.patchForStatus(job, nextStatus));
  }

  updateJob(jobId: string, patch: Partial<JobRecord>): JobRecord {
    return this.jobs.update(jobId, patch);
  }

  updateProgress(jobId: string, patch: { currentPhase?: string; progressPercent?: number }): JobRecord {
    const job = this.getJob(jobId);
    const now = new Date().toISOString();
    const nextProgress = patch.progressPercent ?? job.progressPercent;
    const nextPhase = patch.currentPhase ?? job.currentPhase;
    const phaseChanged = patch.currentPhase !== undefined && patch.currentPhase !== job.currentPhase;
    return this.jobs.update(jobId, {
      currentPhase: nextPhase,
      progressPercent: nextProgress,
      currentPhaseStartedAt: phaseChanged ? now : job.currentPhaseStartedAt,
      lastProgressAt: now,
      estimatedCompletionAt: estimateCompletionAt(job.startedAt, nextProgress)
    });
  }

  answerClarification(jobId: string, answer: string): JobRecord {
    const job = this.getJob(jobId);
    if (job.status !== "awaiting_clarification") {
      throw new Error(`Job ${jobId} is not awaiting clarification.`);
    }

    const trimmedAnswer = answer.trim();
    const updated = this.jobs.update(jobId, {
      rawRequest: [
        job.rawRequest.trim(),
        "",
        formatClarificationForRawRequest({
          stage: job.clarificationStage,
          question: job.clarificationQuestion,
          answer: trimmedAnswer
        })
      ].join("\n"),
      status: "queued",
      cancellationRequested: false,
      clarificationQuestion: undefined,
      clarificationOptions: undefined,
      clarificationStage: undefined,
      failureReason: undefined,
      currentPhase: undefined,
      currentPhaseStartedAt: undefined,
      currentStatusAt: new Date().toISOString(),
      lastProgressAt: new Date().toISOString(),
      estimatedCompletionAt: estimateCompletionAt(job.startedAt, job.progressPercent)
    });
    this.appendEvent(jobId, "queued", "Clarification answer received from Telegram. Job re-queued.", {
      answer: trimmedAnswer
    });
    return updated;
  }

  appendEvent(jobId: string, stage: JobStatus, message: string, metadata?: Record<string, unknown>): void {
    this.jobs.appendEvent(jobId, stage, message, metadata);
  }

  getEvents(jobId: string): JobEvent[] {
    return this.jobs.listEvents(jobId);
  }

  requestCancellation(jobId: string): JobRecord {
    const job = this.getJob(jobId);
    if (job.status === "queued" || job.status === "awaiting_clarification") {
      const cancelled = this.setStatus(jobId, "cancelled");
      this.appendEvent(jobId, "cancelled", "Job cancelled before execution started.", {
        previousStatus: job.status
      });
      return cancelled;
    }

    if (job.status === "cancelling") {
      return job;
    }

    const patch = this.patchForStatus(job, "cancelling");
    const updated = this.jobs.update(jobId, {
      ...patch,
      cancellationRequested: true,
      failureReason: "Cancelled by user."
    });
    this.appendEvent(jobId, "cancelling", "Cancellation requested.", {
      previousStatus: job.status
    });
    return updated;
  }

  finalizeCancellation(jobId: string, message = "Job cancelled by user."): JobRecord {
    const job = this.getJob(jobId);
    const updated = this.jobs.update(jobId, {
      ...this.patchForStatus(job, "cancelled"),
      failureReason: "Cancelled by user.",
      clarificationQuestion: undefined,
      clarificationOptions: undefined,
      clarificationStage: undefined
    });
    this.appendEvent(jobId, "cancelled", message, { previousStatus: job.status });
    return updated;
  }

  recoverInterruptedJobs(): void {
    const recoverable = this.listJobsByStatuses([
      "queued",
      "specifying",
      "generating",
      "validating",
      "repairing",
      "deploying",
      "verifying",
      "cancelling"
    ]);

    for (const job of recoverable) {
      if (job.status === "queued") {
        continue;
      }

      if (job.cancellationRequested || job.status === "cancelling") {
        this.finalizeCancellation(job.id, "Job marked cancelled during startup recovery.");
        continue;
      }

      const now = new Date().toISOString();
      this.jobs.update(job.id, {
        status: "queued",
        currentStatusAt: now,
        currentPhase: undefined,
        currentPhaseStartedAt: undefined,
        estimatedCompletionAt: undefined
      });
      this.appendEvent(job.id, "queued", "Job re-queued during startup recovery.", {
        previousStatus: job.status
      });
    }
  }

  isActiveStatus(status: JobStatus): boolean {
    return ACTIVE_JOB_STATUSES.includes(status);
  }
}

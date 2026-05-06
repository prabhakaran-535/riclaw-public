import type { AccessControl } from "../auth/accessControl.js";
import type { JobManager } from "../jobs/jobManager.js";
import type { JobQueue } from "../jobs/jobQueue.js";
import type { JobRunner } from "../jobs/jobRunner.js";
import type { JobRecord, JobStatus } from "../jobs/jobTypes.js";
import type { PendingEditRequestRepository } from "../projects/pendingEditRequestRepository.js";
import type { PendingEditRequest } from "../projects/pendingEditRequestTypes.js";
import type { PendingRollbackRequestRepository } from "../projects/pendingRollbackRequestRepository.js";
import type { PendingRollbackRequest } from "../projects/pendingRollbackRequestTypes.js";
import type { ProjectManager } from "../projects/projectManager.js";
import type { TelegramMessageReferenceRepository } from "./telegramMessageReferenceRepository.js";

export type BuildAppDraft = {
  appName: string;
  description: string;
  featureList: string;
};

export type BuildSubmissionResult =
  | {
      ok: false;
      reason: "unauthorized";
    }
  | {
      ok: true;
      jobId: string;
      summaryLines: string[];
    };

export type ClarificationAnswerResult =
  | {
      kind: "no_pending";
    }
  | {
      kind: "invalid_option";
      jobId: string;
      options: string[];
    }
  | {
      kind: "accepted";
      jobId: string;
    };

export type BuildProgressResult =
  | {
      kind: "no_active_build";
    }
  | {
      kind: "active_build";
      jobId: string;
      statusLabel: string;
      progressPercent: number;
      currentPhase?: string;
      etaText: string;
      awaitingClarification: boolean;
    };

export type StopBuildResult =
  | {
      kind: "no_active_build";
    }
  | {
      kind: "stopped";
      jobId: string;
      message: string;
    };

export type TelegramAdminResult =
  | {
      ok: false;
      reason: "not_owner" | "invalid_user_id";
      users?: undefined;
    }
  | {
      ok: true;
      message?: string;
      users?: Array<{ telegramUserId: string; role: string; status: string }>;
    };

export type EditRequestReplyResult =
  | {
      kind: "not_edit_reply";
    }
  | {
      kind: "unauthorized_requester";
    }
  | {
      kind: "change_in_progress";
      appName: string;
    }
  | {
      kind: "pending_confirmation";
      pendingEditRequestId: string;
      appName: string;
      requestedChange: string;
    };

export type ConfirmEditResult =
  | {
      kind: "not_found";
    }
  | {
      kind: "unauthorized_requester";
    }
  | {
      kind: "already_resolved";
      status: PendingEditRequest["status"];
    }
  | {
      kind: "change_in_progress";
      appName: string;
    }
  | {
      kind: "no_live_revision";
      appName: string;
    }
  | {
      kind: "confirmed";
      appName: string;
      jobId: string;
    };

export type CancelEditResult =
  | {
      kind: "not_found";
    }
  | {
      kind: "unauthorized_requester";
    }
  | {
      kind: "already_resolved";
      status: PendingEditRequest["status"];
    }
  | {
      kind: "cancelled";
      appName: string;
    };

export type ListAppsResult = {
  apps: Array<{
    projectId: string;
    appName: string;
    slug: string;
    latestRevisionNumber?: number;
    latestDeploymentUrl?: string;
  }>;
};

export type AppDetailsResult =
  | {
      kind: "not_found";
    }
  | {
      kind: "found";
      projectId: string;
      appName: string;
      slug: string;
      latestRevisionNumber?: number;
      latestRevisionStatus?: string;
      latestDeploymentUrl?: string;
      totalRevisionCount: number;
    };

export type RevisionHistoryResult =
  | {
      kind: "not_found";
    }
  | {
      kind: "found";
      projectId: string;
      appName: string;
      revisions: Array<{
        revisionId: string;
        revisionNumber: number;
        status: string;
        deploymentUrl?: string;
        createdAt: string;
      }>;
    };

export type StartRollbackResult =
  | {
      kind: "not_found";
    }
  | {
      kind: "revision_not_found";
      appName: string;
    }
  | {
      kind: "revision_not_completed";
      appName: string;
      revisionNumber: number;
    }
  | {
      kind: "already_latest";
      appName: string;
      revisionNumber: number;
    }
  | {
      kind: "change_in_progress";
      appName: string;
    }
  | {
      kind: "pending_confirmation";
      pendingRollbackRequestId: string;
      appName: string;
      revisionNumber: number;
    };

export type ConfirmRollbackResult =
  | {
      kind: "not_found";
    }
  | {
      kind: "unauthorized_requester";
    }
  | {
      kind: "already_resolved";
      status: PendingRollbackRequest["status"];
    }
  | {
      kind: "change_in_progress";
      appName: string;
    }
  | {
      kind: "target_not_available";
      appName: string;
    }
  | {
      kind: "confirmed";
      appName: string;
      revisionNumber: number;
      jobId: string;
    };

export type CancelRollbackResult =
  | {
      kind: "not_found";
    }
  | {
      kind: "unauthorized_requester";
    }
  | {
      kind: "already_resolved";
      status: PendingRollbackRequest["status"];
    }
  | {
      kind: "cancelled";
      appName: string;
      revisionNumber: number;
    };

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

function buildRawRequest(draft: BuildAppDraft): string {
  return [
    "Build an app with the following details:",
    `Name of App: ${draft.appName}`,
    `Description of App: ${draft.description}`,
    "List of Features:",
    draft.featureList
  ].join("\n");
}

function buildEditRawRequest(input: {
  appName: string;
  deliveryRevisionNumber: number;
  latestRevisionNumber: number;
  requestedChange: string;
}): string {
  return [
    `Revise the existing app "${input.appName}".`,
    `Original delivery revision referenced by the user: ${input.deliveryRevisionNumber}.`,
    `Use the latest successful revision as the base: ${input.latestRevisionNumber}.`,
    "Requested change:",
    input.requestedChange.trim()
  ].join("\n");
}

function buildRollbackRawRequest(input: {
  appName: string;
  targetRevisionNumber: number;
  latestRevisionNumber: number;
}): string {
  return [
    `Roll back the existing app "${input.appName}".`,
    `Restore behavior from successful revision ${input.targetRevisionNumber}.`,
    `The latest successful revision before rollback was ${input.latestRevisionNumber}.`,
    "Apply the rollback by starting from the selected successful revision workspace and redeploying it as a new revision."
  ].join("\n");
}

function getEtaText(job: JobRecord): string {
  if (job.status === "awaiting_clarification") {
    return "waiting for your reply";
  }

  if (job.status === "cancelling") {
    return "stopping after the current step";
  }

  if (job.estimatedCompletionAt) {
    const remainingMs = new Date(job.estimatedCompletionAt).getTime() - Date.now();
    if (remainingMs > 0) {
      const remainingMinutes = Math.max(1, Math.round(remainingMs / 60000));
      return `about ${remainingMinutes} minute${remainingMinutes === 1 ? "" : "s"}`;
    }
  }

  const etaByStatus: Record<JobStatus, string> = {
    queued: "waiting in the queue",
    awaiting_clarification: "waiting for your reply",
    specifying: "about 12 to 18 minutes",
    rejected: "not available",
    generating: "about 8 to 15 minutes",
    validating: "about 3 to 8 minutes",
    repairing: "about 5 to 12 minutes",
    deploying: "about 2 to 5 minutes",
    verifying: "about 1 to 3 minutes",
    cancelling: "stopping after the current step",
    cancelled: "stopped",
    completed: "completed",
    failed: "stopped"
  };

  return etaByStatus[job.status];
}

function getStatusLabel(job: JobRecord): string {
  switch (job.status) {
    case "awaiting_clarification":
      return "Waiting for clarification";
    case "specifying":
      return "Planning the app";
    case "generating":
      return "Generating the app";
    case "validating":
      return "Validating the app";
    case "repairing":
      return "Fixing validation issues";
    case "deploying":
      return "Deploying the app";
    case "verifying":
      return "Verifying the live app";
    case "queued":
      return "Queued to start";
    case "cancelling":
      return "Cancelling";
    case "cancelled":
      return "Cancelled";
    case "completed":
      return "Completed";
    case "failed":
      return "Failed";
    case "rejected":
      return "Rejected";
  }
}

export class TelegramBuildUseCases {
  constructor(
    private readonly accessControl: AccessControl,
    private readonly jobManager: JobManager,
    private readonly jobQueue: JobQueue,
    private readonly jobRunner: JobRunner,
    private readonly projectManager: ProjectManager,
    private readonly pendingEditRequests: PendingEditRequestRepository,
    private readonly pendingRollbackRequests: PendingRollbackRequestRepository,
    private readonly telegramMessageReferences: TelegramMessageReferenceRepository
  ) {}

  canStartBuild(userId: string): boolean {
    return this.accessControl.canStartBuild(userId);
  }

  submitBuildRequest(input: { userId: string; chatId: string; draft: BuildAppDraft }): BuildSubmissionResult {
    if (!this.accessControl.canStartBuild(input.userId)) {
      return { ok: false, reason: "unauthorized" };
    }

    const rawRequest = buildRawRequest(input.draft);
    const job = this.jobManager.createJob({
      userId: input.userId,
      chatId: input.chatId,
      rawRequest
    });
    this.jobQueue.enqueue(job.id);

    return {
      ok: true,
      jobId: job.id,
      summaryLines: [
        `Starting your build for "${input.draft.appName}".`,
        "",
        "Summary:",
        `Name: ${input.draft.appName}`,
        `Description: ${input.draft.description}`,
        `Features: ${input.draft.featureList}`
      ]
    };
  }

  answerClarification(input: { chatId: string; text: string }): ClarificationAnswerResult {
    const job = this.jobManager.findLatestJobAwaitingClarification(input.chatId);
    if (!job) {
      return { kind: "no_pending" };
    }

    const options = job.clarificationOptions ?? [];
    if (options.length > 0 && !options.includes(input.text.trim())) {
      return {
        kind: "invalid_option",
        jobId: job.id,
        options
      };
    }

    const updatedJob = this.jobManager.answerClarification(job.id, input.text);
    this.jobQueue.enqueue(updatedJob.id);
    return {
      kind: "accepted",
      jobId: updatedJob.id
    };
  }

  getActiveBuildProgress(chatId: string): BuildProgressResult {
    const activeJob = this.jobManager.findLatestActiveJob(chatId);
    if (!activeJob) {
      return { kind: "no_active_build" };
    }

    return {
      kind: "active_build",
      jobId: activeJob.id,
      statusLabel: getStatusLabel(activeJob),
      progressPercent: activeJob.progressPercent,
      currentPhase: activeJob.currentPhase,
      etaText: getEtaText(activeJob),
      awaitingClarification: activeJob.status === "awaiting_clarification"
    };
  }

  stopActiveBuild(chatId: string): StopBuildResult {
    const activeJob = this.jobManager.findLatestActiveJob(chatId);
    if (!activeJob || !ACTIVE_JOB_STATUSES.includes(activeJob.status)) {
      return { kind: "no_active_build" };
    }

    const result = this.jobRunner.cancel(activeJob.id);
    return {
      kind: "stopped",
      jobId: activeJob.id,
      message: result.message
    };
  }

  hasActiveBuild(chatId: string): boolean {
    return this.jobManager.findLatestActiveJob(chatId) != null;
  }

  listApps(userId: string): ListAppsResult {
    const projects = this.projectManager.listProjectsForUser(userId);
    return {
      apps: projects.map((project) => {
        const latestRevision = project.latestRevisionId
          ? this.projectManager.getRevision(project.latestRevisionId)
          : this.projectManager.getLatestRevisionForProject(project.id);
        return {
          projectId: project.id,
          appName: project.appName,
          slug: project.slug,
          latestRevisionNumber: latestRevision?.revisionNumber,
          latestDeploymentUrl: latestRevision?.deploymentUrl
        };
      })
    };
  }

  getAppDetails(input: { userId: string; projectKey: string }): AppDetailsResult {
    const project = this.projectManager.findProjectForUser(input.userId, input.projectKey);
    if (!project) {
      return { kind: "not_found" };
    }

    const revisions = this.projectManager.listRevisionsForProject(project.id);
    const latestRevision = project.latestRevisionId
      ? this.projectManager.getRevision(project.latestRevisionId)
      : revisions[0];
    return {
      kind: "found",
      projectId: project.id,
      appName: project.appName,
      slug: project.slug,
      latestRevisionNumber: latestRevision?.revisionNumber,
      latestRevisionStatus: latestRevision?.status,
      latestDeploymentUrl: latestRevision?.deploymentUrl,
      totalRevisionCount: revisions.length
    };
  }

  getRevisionHistory(input: { userId: string; projectKey: string }): RevisionHistoryResult {
    const project = this.projectManager.findProjectForUser(input.userId, input.projectKey);
    if (!project) {
      return { kind: "not_found" };
    }

    return {
      kind: "found",
      projectId: project.id,
      appName: project.appName,
      revisions: this.projectManager.listRevisionsForProject(project.id).map((revision) => ({
        revisionId: revision.id,
        revisionNumber: revision.revisionNumber,
        status: revision.status,
        deploymentUrl: revision.deploymentUrl,
        createdAt: revision.createdAt
      }))
    };
  }

  submitEditRequestReply(input: {
    userId: string;
    chatId: string;
    replyToMessageId?: number;
    replyMessageId: number;
    requestedChange: string;
  }): EditRequestReplyResult {
    if (!input.replyToMessageId) {
      return { kind: "not_edit_reply" };
    }

    const deliveryReference = this.telegramMessageReferences.findByChatAndMessage(input.chatId, input.replyToMessageId);
    if (!deliveryReference || deliveryReference.kind !== "delivery") {
      return { kind: "not_edit_reply" };
    }

    const project = this.projectManager.getProject(deliveryReference.projectId);
    if (project.userId !== input.userId) {
      return { kind: "unauthorized_requester" };
    }

    if (this.hasActiveOrPendingChange(project.id)) {
      return { kind: "change_in_progress", appName: project.appName };
    }

    const pendingEditRequest = this.pendingEditRequests.create({
      projectId: project.id,
      deliveryRevisionId: deliveryReference.revisionId,
      requesterUserId: input.userId,
      chatId: input.chatId,
      replyMessageId: input.replyMessageId,
      requestedChange: input.requestedChange.trim()
    });

    return {
      kind: "pending_confirmation",
      pendingEditRequestId: pendingEditRequest.id,
      appName: project.appName,
      requestedChange: pendingEditRequest.requestedChange
    };
  }

  recordPendingEditConfirmationMessage(pendingEditRequestId: string, confirmationMessageId: number): PendingEditRequest {
    return this.pendingEditRequests.update(pendingEditRequestId, { confirmationMessageId });
  }

  confirmPendingEditRequest(input: { pendingEditRequestId: string; userId: string }): ConfirmEditResult {
    let pendingEditRequest: PendingEditRequest;
    try {
      pendingEditRequest = this.pendingEditRequests.getById(input.pendingEditRequestId);
    } catch {
      return { kind: "not_found" };
    }

    const project = this.projectManager.getProject(pendingEditRequest.projectId);
    if (project.userId !== input.userId || pendingEditRequest.requesterUserId !== input.userId) {
      return { kind: "unauthorized_requester" };
    }

    if (pendingEditRequest.status !== "pending_confirmation") {
      return { kind: "already_resolved", status: pendingEditRequest.status };
    }

    if (this.hasActiveOrPendingChange(project.id, pendingEditRequest.id)) {
      return { kind: "change_in_progress", appName: project.appName };
    }

    if (!project.latestRevisionId) {
      return { kind: "no_live_revision", appName: project.appName };
    }

    const deliveryRevision = this.projectManager.getRevision(pendingEditRequest.deliveryRevisionId);
    const latestRevision = this.projectManager.getRevision(project.latestRevisionId);
    const rawRequest = buildEditRawRequest({
      appName: project.appName,
      deliveryRevisionNumber: deliveryRevision.revisionNumber,
      latestRevisionNumber: latestRevision.revisionNumber,
      requestedChange: pendingEditRequest.requestedChange
    });
    const job = this.jobManager.createJob({
      userId: pendingEditRequest.requesterUserId,
      chatId: pendingEditRequest.chatId,
      rawRequest,
      projectId: project.id,
      baseRevisionId: latestRevision.id,
      templateName: latestRevision.templateName
    });
    const revision = this.projectManager.createRevision({
      projectId: project.id,
      sourceJobId: job.id,
      templateName: latestRevision.templateName
    });
    this.jobManager.updateJob(job.id, {
      revisionId: revision.id,
      templateName: latestRevision.templateName
    });
    this.pendingEditRequests.update(pendingEditRequest.id, {
      status: "confirmed",
      confirmedAt: new Date().toISOString(),
      confirmedJobId: job.id,
      confirmedRevisionId: revision.id
    });
    this.jobQueue.enqueue(job.id);

    return {
      kind: "confirmed",
      appName: project.appName,
      jobId: job.id
    };
  }

  cancelPendingEditRequest(input: { pendingEditRequestId: string; userId: string }): CancelEditResult {
    let pendingEditRequest: PendingEditRequest;
    try {
      pendingEditRequest = this.pendingEditRequests.getById(input.pendingEditRequestId);
    } catch {
      return { kind: "not_found" };
    }

    const project = this.projectManager.getProject(pendingEditRequest.projectId);
    if (project.userId !== input.userId || pendingEditRequest.requesterUserId !== input.userId) {
      return { kind: "unauthorized_requester" };
    }

    if (pendingEditRequest.status !== "pending_confirmation") {
      return { kind: "already_resolved", status: pendingEditRequest.status };
    }

    this.pendingEditRequests.update(pendingEditRequest.id, {
      status: "cancelled",
      cancelledAt: new Date().toISOString()
    });
    return {
      kind: "cancelled",
      appName: project.appName
    };
  }

  startRollbackRequest(input: {
    userId: string;
    chatId: string;
    projectKey: string;
    revisionNumber: number;
  }): StartRollbackResult {
    const project = this.projectManager.findProjectForUser(input.userId, input.projectKey);
    if (!project) {
      return { kind: "not_found" };
    }

    if (this.hasActiveOrPendingChange(project.id)) {
      return { kind: "change_in_progress", appName: project.appName };
    }

    const targetRevision = this.projectManager.getRevisionForProject(project.id, input.revisionNumber);
    if (!targetRevision) {
      return { kind: "revision_not_found", appName: project.appName };
    }

    if (targetRevision.status !== "completed" || !targetRevision.workspacePath) {
      return {
        kind: "revision_not_completed",
        appName: project.appName,
        revisionNumber: input.revisionNumber
      };
    }

    const latestRevision = project.latestRevisionId
      ? this.projectManager.getRevision(project.latestRevisionId)
      : this.projectManager.getLatestRevisionForProject(project.id);
    if (latestRevision?.id === targetRevision.id) {
      return {
        kind: "already_latest",
        appName: project.appName,
        revisionNumber: input.revisionNumber
      };
    }

    const pendingRollbackRequest = this.pendingRollbackRequests.create({
      projectId: project.id,
      targetRevisionId: targetRevision.id,
      requesterUserId: input.userId,
      chatId: input.chatId,
      requestedRevisionNumber: targetRevision.revisionNumber
    });

    return {
      kind: "pending_confirmation",
      pendingRollbackRequestId: pendingRollbackRequest.id,
      appName: project.appName,
      revisionNumber: targetRevision.revisionNumber
    };
  }

  recordPendingRollbackConfirmationMessage(
    pendingRollbackRequestId: string,
    confirmationMessageId: number
  ): PendingRollbackRequest {
    return this.pendingRollbackRequests.update(pendingRollbackRequestId, { confirmationMessageId });
  }

  confirmPendingRollbackRequest(input: { pendingRollbackRequestId: string; userId: string }): ConfirmRollbackResult {
    let pendingRollbackRequest: PendingRollbackRequest;
    try {
      pendingRollbackRequest = this.pendingRollbackRequests.getById(input.pendingRollbackRequestId);
    } catch {
      return { kind: "not_found" };
    }

    const project = this.projectManager.getProject(pendingRollbackRequest.projectId);
    if (project.userId !== input.userId || pendingRollbackRequest.requesterUserId !== input.userId) {
      return { kind: "unauthorized_requester" };
    }

    if (pendingRollbackRequest.status !== "pending_confirmation") {
      return { kind: "already_resolved", status: pendingRollbackRequest.status };
    }

    if (this.hasActiveOrPendingChange(project.id, undefined, pendingRollbackRequest.id)) {
      return { kind: "change_in_progress", appName: project.appName };
    }

    const targetRevision = this.projectManager.getRevision(pendingRollbackRequest.targetRevisionId);
    if (targetRevision.status !== "completed" || !targetRevision.workspacePath) {
      return { kind: "target_not_available", appName: project.appName };
    }

    const latestRevision = project.latestRevisionId
      ? this.projectManager.getRevision(project.latestRevisionId)
      : this.projectManager.getLatestRevisionForProject(project.id);
    const rawRequest = buildRollbackRawRequest({
      appName: project.appName,
      targetRevisionNumber: targetRevision.revisionNumber,
      latestRevisionNumber: latestRevision?.revisionNumber ?? targetRevision.revisionNumber
    });
    const job = this.jobManager.createJob({
      userId: pendingRollbackRequest.requesterUserId,
      chatId: pendingRollbackRequest.chatId,
      rawRequest,
      projectId: project.id,
      baseRevisionId: targetRevision.id,
      templateName: targetRevision.templateName
    });
    const revision = this.projectManager.createRevision({
      projectId: project.id,
      sourceJobId: job.id,
      templateName: targetRevision.templateName
    });
    this.jobManager.updateJob(job.id, {
      revisionId: revision.id,
      templateName: targetRevision.templateName
    });
    this.pendingRollbackRequests.update(pendingRollbackRequest.id, {
      status: "confirmed",
      confirmedAt: new Date().toISOString(),
      confirmedJobId: job.id,
      confirmedRevisionId: revision.id
    });
    this.jobQueue.enqueue(job.id);

    return {
      kind: "confirmed",
      appName: project.appName,
      revisionNumber: targetRevision.revisionNumber,
      jobId: job.id
    };
  }

  cancelPendingRollbackRequest(input: { pendingRollbackRequestId: string; userId: string }): CancelRollbackResult {
    let pendingRollbackRequest: PendingRollbackRequest;
    try {
      pendingRollbackRequest = this.pendingRollbackRequests.getById(input.pendingRollbackRequestId);
    } catch {
      return { kind: "not_found" };
    }

    const project = this.projectManager.getProject(pendingRollbackRequest.projectId);
    if (project.userId !== input.userId || pendingRollbackRequest.requesterUserId !== input.userId) {
      return { kind: "unauthorized_requester" };
    }

    if (pendingRollbackRequest.status !== "pending_confirmation") {
      return { kind: "already_resolved", status: pendingRollbackRequest.status };
    }

    this.pendingRollbackRequests.update(pendingRollbackRequest.id, {
      status: "cancelled",
      cancelledAt: new Date().toISOString()
    });
    return {
      kind: "cancelled",
      appName: project.appName,
      revisionNumber: pendingRollbackRequest.requestedRevisionNumber
    };
  }

  private hasActiveOrPendingChange(
    projectId: string,
    ignoredPendingEditRequestId?: string,
    ignoredPendingRollbackRequestId?: string
  ): boolean {
    if (this.jobManager.findLatestActiveJobForProject(projectId)) {
      return true;
    }

    const pendingEditRequest = this.pendingEditRequests.findLatestPendingByProject(projectId);
    if (pendingEditRequest != null && pendingEditRequest.id !== ignoredPendingEditRequestId) {
      return true;
    }

    const pendingRollbackRequest = this.pendingRollbackRequests.findLatestPendingByProject(projectId);
    return pendingRollbackRequest != null && pendingRollbackRequest.id !== ignoredPendingRollbackRequestId;
  }
}

export class TelegramAdminUseCases {
  constructor(private readonly accessControl: AccessControl) {}

  listUsers(userId: string): TelegramAdminResult {
    if (!this.accessControl.isOwner(userId)) {
      return { ok: false, reason: "not_owner" };
    }

    return {
      ok: true,
      users: this.accessControl.listUsers().map((user) => ({
        telegramUserId: user.telegramUserId,
        role: user.role,
        status: user.status
      }))
    };
  }

  allowUser(input: { actorUserId: string; targetUserId: string; role: "owner" | "builder" }): TelegramAdminResult {
    if (!this.accessControl.isOwner(input.actorUserId)) {
      return { ok: false, reason: "not_owner" };
    }

    if (!/^\d+$/.test(input.targetUserId)) {
      return { ok: false, reason: "invalid_user_id" };
    }

    this.accessControl.allowUser(input.targetUserId, input.actorUserId, input.role);
    return {
      ok: true,
      message: `Authorized ${input.targetUserId} as ${input.role}.`
    };
  }

  revokeUser(input: { actorUserId: string; targetUserId: string }): TelegramAdminResult {
    if (!this.accessControl.isOwner(input.actorUserId)) {
      return { ok: false, reason: "not_owner" };
    }

    if (!/^\d+$/.test(input.targetUserId)) {
      return { ok: false, reason: "invalid_user_id" };
    }

    this.accessControl.revokeUser(input.targetUserId, input.actorUserId);
    return {
      ok: true,
      message: `Revoked access for ${input.targetUserId}.`
    };
  }
}

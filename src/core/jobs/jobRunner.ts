import { logger } from "../../shared/logger.js";
import { BaseTemplateSelector } from "../generation/baseTemplateSelector.js";
import { GenerationPlanner } from "../generation/generationPlanner.js";
import { FeasibilityChecker } from "../specs/feasibilityChecker.js";
import { FeatureModuleSelector } from "../generation/featureModuleSelector.js";
import { SpecExtractor } from "../specs/specExtractor.js";
import { Validator } from "../validation/validator.js";
import { RepairLoop } from "../generation/repairLoop.js";
import { DeployService } from "../deployment/deployService.js";
import { LiveVerifier } from "../deployment/liveVerifier.js";
import { WorkspaceManager } from "../workspaces/workspaceManager.js";
import { WorkspaceCustomizer } from "../workspaces/workspaceCustomizer.js";
import { ArtifactStore } from "../workspaces/artifactStore.js";
import { JobManager } from "./jobManager.js";
import { TelegramNotifier } from "../notifications/telegramNotifier.js";
import { CodexRunner } from "../generation/codexRunner.js";
import { ClarificationPlanner } from "../clarifications/clarificationPlanner.js";
import { ClarificationRequiredError, type ClarificationStage } from "../clarifications/clarificationTypes.js";
import { ProjectManager } from "../projects/projectManager.js";
import { ProjectStorage } from "../projects/projectStorage.js";
import type { TelegramMessageReferenceRepository } from "../telegram/telegramMessageReferenceRepository.js";

type JobRunnerDeps = {
  jobManager: JobManager;
  projectManager: ProjectManager;
  projectStorage: ProjectStorage;
  specExtractor: SpecExtractor;
  feasibilityChecker: FeasibilityChecker;
  baseTemplateSelector: BaseTemplateSelector;
  featureModuleSelector: FeatureModuleSelector;
  workspaceManager: WorkspaceManager;
  workspaceCustomizer: WorkspaceCustomizer;
  artifactStore: ArtifactStore;
  generationPlanner: GenerationPlanner;
  codexRunner: CodexRunner;
  validator: Validator;
  repairLoop: RepairLoop;
  clarificationPlanner: ClarificationPlanner;
  deployService: DeployService;
  liveVerifier: LiveVerifier;
  telegramNotifier: TelegramNotifier;
  telegramMessageReferenceRepository: TelegramMessageReferenceRepository;
};

class CancellationRequestedError extends Error {
  constructor(readonly alreadyFinalized = false) {
    super("Cancelled by user.");
    this.name = "CancellationRequestedError";
  }
}

export class JobRunner {
  constructor(private readonly deps: JobRunnerDeps) {}

  private requestClarification(stage: ClarificationStage, question: string, options: string[] = []): never {
    throw new ClarificationRequiredError({ stage, question, options });
  }

  private async safeNotify(action: string, send: () => Promise<unknown>): Promise<void> {
    try {
      await send();
    } catch (error) {
      logger.error("Telegram notification failed.", {
        action,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private throwIfCancellationRequested(jobId: string): void {
    const job = this.deps.jobManager.getJob(jobId);
    if (job.cancellationRequested) {
      throw new CancellationRequestedError();
    }

    if (job.status === "cancelled") {
      throw new CancellationRequestedError(true);
    }
  }

  cancel(jobId: string): { accepted: boolean; stoppedActivePhase: boolean; message: string } {
    const job = this.deps.jobManager.getJob(jobId);
    if (job.status === "completed") {
      return { accepted: false, stoppedActivePhase: false, message: "This app is already completed." };
    }

    if (job.status === "failed" || job.status === "rejected" || job.status === "cancelled") {
      return { accepted: false, stoppedActivePhase: false, message: "This job is already finished." };
    }

    const updated = this.deps.jobManager.requestCancellation(jobId);
    if (updated.status === "cancelled") {
      return {
        accepted: true,
        stoppedActivePhase: false,
        message: "RIClaw cancelled your build."
      };
    }

    const stoppedActivePhase = this.deps.codexRunner.cancel(jobId);

    if (
      job.status === "queued"
    ) {
      return {
        accepted: true,
        stoppedActivePhase,
        message: "RIClaw cancelled your build."
      };
    }

    return {
      accepted: true,
      stoppedActivePhase,
      message: stoppedActivePhase
        ? "RIClaw is stopping your build now."
        : "RIClaw has marked your build to stop after the current step finishes."
    };
  }

  async run(jobId: string): Promise<void> {
    const initialJob = this.deps.jobManager.getJob(jobId);
    try {
      this.throwIfCancellationRequested(jobId);

      this.deps.jobManager.setStatus(jobId, "specifying");
      this.deps.jobManager.updateProgress(jobId, { currentPhase: "extract_spec", progressPercent: 5 });
      this.throwIfCancellationRequested(jobId);
      const requestClarification = this.deps.clarificationPlanner.forRawRequest(initialJob.rawRequest);
      if (requestClarification) {
        this.requestClarification(
          requestClarification.stage,
          requestClarification.question,
          requestClarification.options
        );
      }
      const spec = await this.deps.specExtractor.extract(initialJob.rawRequest);
      this.throwIfCancellationRequested(jobId);
      await this.deps.workspaceManager.writeSpec(jobId, spec);
      this.deps.jobManager.appendEvent(jobId, "specifying", "App spec generated.", { spec });

      const feasibility = this.deps.feasibilityChecker.check(spec);
      if (!feasibility.allowed) {
        this.deps.jobManager.setStatus(jobId, "rejected");
        this.deps.jobManager.appendEvent(jobId, "rejected", feasibility.reason ?? "Rejected.");
        await this.safeNotify("request_rejected", () =>
          this.deps.telegramNotifier.sendProgress(
            initialJob.chatId,
            feasibility.reason ?? "Request rejected."
          )
        );
        return;
      }

      this.deps.jobManager.setStatus(jobId, "generating");
      this.deps.jobManager.updateProgress(jobId, { currentPhase: "assemble_workspace", progressPercent: 18 });
      this.throwIfCancellationRequested(jobId);
      const specClarification = this.deps.clarificationPlanner.forSpec(spec, initialJob.rawRequest);
      if (specClarification) {
        this.requestClarification(specClarification.stage, specClarification.question, specClarification.options);
      }
      const moduleClarification = initialJob.baseRevisionId
        ? null
        : this.deps.featureModuleSelector.findClarification(spec, initialJob.rawRequest);
      if (moduleClarification) {
        this.requestClarification(moduleClarification.stage, moduleClarification.question, moduleClarification.options);
      }
      const project =
        initialJob.projectId != null
          ? this.deps.projectManager.getProject(initialJob.projectId)
          : this.deps.projectManager.createProject({
              userId: initialJob.userId,
              chatId: initialJob.chatId,
              appName: spec.appName
            });
      const revision =
        initialJob.revisionId != null
          ? this.deps.projectManager.getRevision(initialJob.revisionId)
          : this.deps.projectManager.createRevision({
              projectId: project.id,
              sourceJobId: jobId
            });
      if (!initialJob.projectId || !initialJob.revisionId) {
        this.deps.jobManager.updateJob(jobId, {
          projectId: project.id,
          revisionId: revision.id
        });
      }
      let workspacePath: string;
      let templateName: string | undefined;
      if (initialJob.baseRevisionId) {
        const baseRevision = this.deps.projectManager.getRevision(initialJob.baseRevisionId);
        if (!baseRevision.workspacePath) {
          throw new Error(`Base revision ${baseRevision.id} does not have a durable workspace.`);
        }
        workspacePath = await this.deps.workspaceManager.createWorkspaceFromExistingRevision(
          jobId,
          baseRevision.workspacePath
        );
        templateName = baseRevision.templateName;
        await this.deps.artifactStore.saveJson(jobId, "workspace-assembly.json", {
          source: "latest_successful_revision",
          baseRevisionId: baseRevision.id,
          baseRevisionNumber: baseRevision.revisionNumber,
          templateName
        });
        this.deps.jobManager.appendEvent(
          jobId,
          "generating",
          "Workspace initialized from the latest successful revision.",
          {
            baseRevisionId: baseRevision.id,
            baseRevisionNumber: baseRevision.revisionNumber
          }
        );
      } else {
        const baseTemplate = this.deps.baseTemplateSelector.select(spec);
        const featureModuleSelection = this.deps.featureModuleSelector.select(spec, initialJob.rawRequest);
        const assemblyPlan = {
          baseTemplate,
          featureModules: featureModuleSelection.modules,
          strategyNotes: [
            ...baseTemplate.strategyNotes,
            ...featureModuleSelection.strategyNotes
          ]
        };
        workspacePath = await this.deps.workspaceManager.assembleWorkspace(jobId, assemblyPlan);
        await this.deps.workspaceCustomizer.applySpec(workspacePath, spec, assemblyPlan);
        await this.deps.artifactStore.saveJson(jobId, "workspace-assembly.json", {
          baseTemplate: assemblyPlan.baseTemplate.id,
          featureModules: assemblyPlan.featureModules.map((module) => module.id),
          strategyNotes: assemblyPlan.strategyNotes
        });
        this.deps.jobManager.appendEvent(jobId, "generating", "Workspace assembled from base template and feature modules.", {
          baseTemplate: assemblyPlan.baseTemplate.id,
          featureModules: assemblyPlan.featureModules.map((module) => module.id)
        });
        templateName = baseTemplate.id;
      }
      this.deps.jobManager.updateJob(jobId, {
        templateName,
        workspacePath
      });
      this.deps.jobManager.updateProgress(jobId, { currentPhase: "scaffold", progressPercent: 20 });

      const phases = this.deps.generationPlanner.plan(spec);
      const phaseProgress = new Map<string, number>([
        ["scaffold", 28],
        ["implement_features", 42],
        ["wire_data", 56],
        ["polish_ui", 68],
        ["prepare_deploy", 74],
        ["fix_errors", 88]
      ]);
      for (const phase of phases) {
        this.throwIfCancellationRequested(jobId);
        this.deps.jobManager.updateProgress(jobId, {
          currentPhase: phase,
          progressPercent: phaseProgress.get(phase) ?? 50
        });
        await this.deps.codexRunner.runPhase(workspacePath, spec, phase, { jobId });
        await this.deps.workspaceManager.appendLog(jobId, "generation", `Completed phase ${phase}.`);
      }

      this.deps.jobManager.setStatus(jobId, "validating");
      this.deps.jobManager.updateProgress(jobId, { currentPhase: "validate_workspace", progressPercent: 78 });
      this.throwIfCancellationRequested(jobId);
      let validation = await this.deps.validator.validateWorkspace(workspacePath);
      await this.deps.artifactStore.saveJson(jobId, "validation-initial.json", validation);
      this.deps.jobManager.appendEvent(jobId, "validating", "Initial validation complete.", {
        passed: validation.passed,
        errors: validation.errors
      });
      const validationClarification = this.deps.clarificationPlanner.forValidation(validation);
      if (validationClarification) {
        this.requestClarification(
          validationClarification.stage,
          validationClarification.question,
          validationClarification.options
        );
      }
      if (!validation.passed) {
        this.deps.jobManager.setStatus(jobId, "repairing");
        this.deps.jobManager.updateProgress(jobId, { currentPhase: "fix_errors", progressPercent: 84 });
        const repair = await this.deps.repairLoop.attemptRepair(
          jobId,
          workspacePath,
          spec,
          validation,
          async () => this.deps.validator.validateWorkspace(workspacePath)
        );
        validation = repair.finalValidation;
        await this.deps.artifactStore.saveJson(jobId, "validation-after-repair.json", validation);
        this.deps.jobManager.appendEvent(jobId, "repairing", "Repair validation complete.", {
          recovered: repair.recovered,
          attempts: repair.attempts,
          passed: validation.passed
        });
      }

      this.throwIfCancellationRequested(jobId);
      if (!validation.passed) {
        this.deps.projectManager.failRevision(revision.id);
        this.deps.jobManager.setStatus(jobId, "failed");
        this.deps.jobManager.updateJob(jobId, {
          failureReason: validation.errors.join("\n")
        });
        await this.deps.artifactStore.save(jobId, "validation-errors.txt", validation.errors.join("\n\n"));
        await this.safeNotify("validation_failed", () =>
          this.deps.telegramNotifier.sendProgress(initialJob.chatId, "Build failed during validation.")
        );
        return;
      }

      this.deps.jobManager.setStatus(jobId, "deploying");
      this.deps.jobManager.updateProgress(jobId, { currentPhase: "deploy_vercel", progressPercent: 92 });
      this.throwIfCancellationRequested(jobId);
      const deployment = await this.deps.deployService.deploy({
        workspacePath,
        spec,
        vercelProjectId: project.vercelProjectId
      });
      if (!deployment.success || !deployment.url) {
        this.deps.projectManager.failRevision(revision.id);
        this.deps.jobManager.setStatus(jobId, "failed");
        this.deps.jobManager.updateJob(jobId, {
          failureReason: deployment.error ?? "Deployment failed."
        });
        await this.safeNotify("deployment_failed", () =>
          this.deps.telegramNotifier.sendProgress(initialJob.chatId, "Vercel deployment failed.")
        );
        return;
      }
      const deploymentUrl = deployment.url;

      this.deps.jobManager.setStatus(jobId, "verifying");
      this.deps.jobManager.updateProgress(jobId, { currentPhase: "verify_live_app", progressPercent: 97 });
      this.throwIfCancellationRequested(jobId);
      const liveCheck = await this.deps.liveVerifier.verify(deploymentUrl);
      if (!liveCheck.ok) {
        this.deps.projectManager.failRevision(revision.id);
        this.deps.jobManager.setStatus(jobId, "failed");
        this.deps.jobManager.updateJob(jobId, {
          failureReason: liveCheck.notes.join("\n")
        });
        await this.safeNotify("verification_failed", () =>
          this.deps.telegramNotifier.sendProgress(initialJob.chatId, "Deployment verification failed.")
        );
        return;
      }

      const durableWorkspacePath = await this.deps.projectStorage.persistRevisionWorkspace(
        project.id,
        revision.id,
        workspacePath
      );
      this.deps.projectManager.completeRevision(revision.id, {
        workspacePath: durableWorkspacePath,
        deploymentUrl,
        templateName
      });
      this.deps.jobManager.setStatus(jobId, "completed");
      this.deps.jobManager.updateJob(jobId, { deploymentUrl, currentPhase: "completed", progressPercent: 100 });
      try {
        const sentCompletionMessage = await this.deps.telegramNotifier.sendCompletion(
          {
            chatId: initialJob.chatId,
            appName: spec.appName,
            deploymentUrl,
            projectId: project.id,
            revisionNumber: revision.revisionNumber,
            slug: project.slug
          }
        );
        this.deps.telegramMessageReferenceRepository.create({
          kind: "delivery",
          chatId: sentCompletionMessage.chatId,
          messageId: sentCompletionMessage.messageId,
          projectId: project.id,
          revisionId: revision.id
        });
      } catch (error) {
        logger.error("Telegram completion notification failed.", {
          jobId,
          error: error instanceof Error ? error.message : String(error)
        });
      }
      logger.info("Job completed.", { jobId, url: deploymentUrl });
    } catch (error) {
      if (error instanceof CancellationRequestedError) {
        const currentJob = this.deps.jobManager.getJob(jobId);
        if (currentJob.revisionId) {
          this.deps.projectManager.failRevision(currentJob.revisionId);
        }
        if (error.alreadyFinalized || currentJob.status === "cancelled") {
          return;
        }

        const job = this.deps.jobManager.finalizeCancellation(jobId, "Job cancelled by user.");
        await this.safeNotify("job_cancelled", () =>
          this.deps.telegramNotifier.sendProgress(job.chatId, "RIClaw cancelled your build.")
        );
        return;
      }
      const currentJob = this.deps.jobManager.getJob(jobId);
      if (
        currentJob.cancellationRequested &&
        error instanceof Error &&
        error.message.includes("Codex execution cancelled.")
      ) {
        const job = this.deps.jobManager.finalizeCancellation(jobId, "Job cancelled by user during generation.");
        await this.safeNotify("job_cancelled", () =>
          this.deps.telegramNotifier.sendProgress(job.chatId, "RIClaw cancelled your build.")
        );
        return;
      }
      if (error instanceof ClarificationRequiredError) {
        const job = this.deps.jobManager.getJob(jobId);
        this.deps.jobManager.setStatus(jobId, "awaiting_clarification");
        this.deps.jobManager.updateJob(jobId, {
          clarificationQuestion: error.clarification.question,
          clarificationOptions: error.clarification.options,
          clarificationStage: error.clarification.stage,
          failureReason: undefined
        });
        this.deps.jobManager.appendEvent(
          jobId,
          "awaiting_clarification",
          "Waiting for clarification from the user.",
          error.clarification
        );
        await this.safeNotify("clarification_requested", () =>
          this.deps.telegramNotifier.sendClarification(
            job.chatId,
            error.clarification.question,
            error.clarification.options
          )
        );
        return;
      }
      if (currentJob.revisionId) {
        this.deps.projectManager.failRevision(currentJob.revisionId);
      }
      const message = error instanceof Error ? error.message : String(error);
      logger.error("Job failed unexpectedly.", { jobId, error: message });
      this.deps.jobManager.appendEvent(jobId, "failed", message);
      try {
        this.deps.jobManager.setStatus(jobId, "failed");
      } catch {
        // Ignore transition failures during cleanup.
      }
      this.deps.jobManager.updateJob(jobId, { failureReason: message });
      await this.safeNotify("job_unexpected_failure", () =>
        this.deps.telegramNotifier.sendProgress(
          initialJob.chatId,
          `RIClaw hit an unexpected failure: ${message}`
        )
      );
    }
  }
}

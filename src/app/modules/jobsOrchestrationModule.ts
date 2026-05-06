import { JobManager } from "../../core/jobs/jobManager.js";
import { JobQueue } from "../../core/jobs/jobQueue.js";
import { JobRunner } from "../../core/jobs/jobRunner.js";
import type { AppModuleDefinition } from "../../kernel/contracts.js";
import type { RiclawServices } from "../services.js";

export const jobsOrchestrationModule: AppModuleDefinition<RiclawServices> = {
  id: "jobs.orchestration",
  name: "Job Orchestration",
  dependencies: ["storage.sqlite", "storage.projects", "generation.runtime", "integrations.telegram", "integrations.vercel"],
  register(container) {
    container.registerSingleton("jobManager", (runtime) => new JobManager(runtime.resolve("jobRepository")));
    container.registerSingleton("jobRunner", (runtime) => {
      return new JobRunner({
        jobManager: runtime.resolve("jobManager"),
        projectManager: runtime.resolve("projectManager"),
        projectStorage: runtime.resolve("projectStorage"),
        specExtractor: runtime.resolve("specExtractor"),
        feasibilityChecker: runtime.resolve("feasibilityChecker"),
        baseTemplateSelector: runtime.resolve("baseTemplateSelector"),
        featureModuleSelector: runtime.resolve("featureModuleSelector"),
        workspaceManager: runtime.resolve("workspaceManager"),
        workspaceCustomizer: runtime.resolve("workspaceCustomizer"),
        artifactStore: runtime.resolve("artifactStore"),
        generationPlanner: runtime.resolve("generationPlanner"),
        codexRunner: runtime.resolve("codexRunner"),
        validator: runtime.resolve("validator"),
        repairLoop: runtime.resolve("repairLoop"),
        clarificationPlanner: runtime.resolve("clarificationPlanner"),
        deployService: runtime.resolve("deployService"),
        liveVerifier: runtime.resolve("liveVerifier"),
        telegramNotifier: runtime.resolve("telegramNotifier"),
        telegramMessageReferenceRepository: runtime.resolve("telegramMessageReferenceRepository")
      });
    });
    container.registerSingleton("jobQueue", (runtime) => {
      return new JobQueue(runtime.resolve("jobManager"), runtime.resolve("jobRunner"));
    });
    container.onStart((runtime) => {
      runtime.resolve("jobQueue").start();
    });
    container.onStop(async (runtime) => {
      await runtime.resolve("jobQueue").stop();
    });
  }
};

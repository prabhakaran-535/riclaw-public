import { setTimeout as delay } from "node:timers/promises";
import { logger } from "../../shared/logger.js";
import type { JobManager } from "./jobManager.js";
import type { JobRunner } from "./jobRunner.js";

export class JobQueue {
  private running = false;
  private loopPromise: Promise<void> | null = null;

  constructor(
    private readonly jobs: JobManager,
    private readonly runner: JobRunner
  ) {}

  start(): void {
    if (this.running) {
      return;
    }

    this.running = true;
    this.jobs.recoverInterruptedJobs();
    this.loopPromise = this.runLoop();
  }

  async stop(): Promise<void> {
    this.running = false;
    await this.loopPromise;
  }

  enqueue(_jobId: string): void {}

  private async runLoop(): Promise<void> {
    while (this.running) {
      const nextJob = this.jobs.findNextQueuedJob();
      if (!nextJob) {
        await delay(250);
        continue;
      }

      try {
        await this.runner.run(nextJob.id);
      } catch (error) {
        logger.error("Queued job execution failed unexpectedly.", {
          jobId: nextJob.id,
          error: error instanceof Error ? error.message : String(error)
        });
        await delay(100);
      }
    }
  }
}

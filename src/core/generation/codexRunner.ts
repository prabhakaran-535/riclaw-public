import type { CodexClient } from "../../integrations/codex/codexClient.js";
import type { GenerationPhase } from "./generationPlanner.js";
import type { AppSpec } from "../specs/specSchema.js";

export type GenerationResult = {
  success: boolean;
  phase: GenerationPhase;
  summary: string;
  changedFiles: string[];
};

type RunPhaseOptions = {
  jobId: string;
  extraContext?: string;
};

export class CodexRunner {
  constructor(private readonly codexClient: CodexClient) {}

  async runPhase(
    workspacePath: string,
    spec: AppSpec,
    phase: GenerationPhase,
    options: RunPhaseOptions
  ): Promise<GenerationResult> {
    await this.codexClient.run({
      jobId: options.jobId,
      workspacePath,
      phase,
      spec,
      extraContext: options.extraContext
    });

    return {
      success: true,
      phase,
      summary: `Codex phase ${phase} completed.`,
      changedFiles: []
    };
  }

  cancel(jobId: string): boolean {
    return this.codexClient.cancel(jobId);
  }
}

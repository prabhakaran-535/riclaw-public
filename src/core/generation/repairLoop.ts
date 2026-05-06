import type { AppConfig } from "../../config/appConfig.js";
import type { AppSpec } from "../specs/specSchema.js";
import type { ValidationResult } from "../validation/validationTypes.js";
import type { CodexRunner } from "./codexRunner.js";

function buildRepairContext(validation: ValidationResult): string {
  return [
    "Fix the validation failures and keep the scope otherwise unchanged.",
    "Prioritize the smallest code changes that make typecheck, build, and smoke validation pass.",
    "Validation errors:",
    validation.errors.join("\n\n")
  ].join("\n\n");
}

export type RepairResult = {
  recovered: boolean;
  attempts: number;
  finalValidation: ValidationResult;
};

export class RepairLoop {
  constructor(
    private readonly codexRunner: CodexRunner,
    private readonly config: AppConfig
  ) {}

  async attemptRepair(
    jobId: string,
    workspacePath: string,
    spec: AppSpec,
    validation: ValidationResult,
    revalidate: () => Promise<ValidationResult>
  ): Promise<RepairResult> {
    let current = validation;
    for (let attempt = 1; attempt <= this.config.MAX_REPAIR_ATTEMPTS; attempt += 1) {
      await this.codexRunner.runPhase(workspacePath, spec, "fix_errors", {
        jobId,
        extraContext: buildRepairContext(current)
      });
      current = await revalidate();
      if (current.passed) {
        return { recovered: true, attempts: attempt, finalValidation: current };
      }
    }

    return {
      recovered: false,
      attempts: this.config.MAX_REPAIR_ATTEMPTS,
      finalValidation: current
    };
  }
}

import type { AppSpec } from "../specs/specSchema.js";

export type GenerationPhase =
  | "scaffold"
  | "implement_features"
  | "wire_data"
  | "polish_ui"
  | "fix_errors"
  | "prepare_deploy";

export class GenerationPlanner {
  plan(_spec: AppSpec): GenerationPhase[] {
    return ["scaffold", "implement_features", "wire_data", "polish_ui", "prepare_deploy"];
  }
}

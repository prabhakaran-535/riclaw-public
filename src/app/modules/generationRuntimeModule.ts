import { ClarificationPlanner } from "../../core/clarifications/clarificationPlanner.js";
import { BaseTemplateSelector } from "../../core/generation/baseTemplateSelector.js";
import { CodexRunner } from "../../core/generation/codexRunner.js";
import { FeatureModuleSelector } from "../../core/generation/featureModuleSelector.js";
import { GenerationPlanner } from "../../core/generation/generationPlanner.js";
import { RepairLoop } from "../../core/generation/repairLoop.js";
import { FeasibilityChecker } from "../../core/specs/feasibilityChecker.js";
import { SpecExtractor } from "../../core/specs/specExtractor.js";
import { ArtifactStore } from "../../core/workspaces/artifactStore.js";
import { WorkspaceCustomizer } from "../../core/workspaces/workspaceCustomizer.js";
import { WorkspaceManager } from "../../core/workspaces/workspaceManager.js";
import { BuildRunner } from "../../core/validation/buildRunner.js";
import { SmokeTester } from "../../core/validation/smokeTester.js";
import { Validator } from "../../core/validation/validator.js";
import type { AppModuleDefinition } from "../../kernel/contracts.js";
import type { RiclawServices } from "../services.js";

export const generationRuntimeModule: AppModuleDefinition<RiclawServices> = {
  id: "generation.runtime",
  name: "Generation Runtime",
  dependencies: ["integrations.codex"],
  register(container) {
    container.registerSingleton("specExtractor", (runtime) => new SpecExtractor(runtime.resolve("codexClient")));
    container.registerSingleton("feasibilityChecker", () => new FeasibilityChecker());
    container.registerSingleton("baseTemplateSelector", () => new BaseTemplateSelector());
    container.registerSingleton("featureModuleSelector", () => new FeatureModuleSelector());
    container.registerSingleton("workspaceManager", (runtime) => new WorkspaceManager(runtime.resolve("config")));
    container.registerSingleton("workspaceCustomizer", () => new WorkspaceCustomizer());
    container.registerSingleton("artifactStore", (runtime) => new ArtifactStore(runtime.resolve("config")));
    container.registerSingleton("generationPlanner", () => new GenerationPlanner());
    container.registerSingleton("codexRunner", (runtime) => new CodexRunner(runtime.resolve("codexClient")));
    container.registerSingleton("buildRunner", () => new BuildRunner());
    container.registerSingleton("smokeTester", () => new SmokeTester());
    container.registerSingleton("validator", (runtime) => {
      return new Validator(runtime.resolve("buildRunner"), runtime.resolve("smokeTester"));
    });
    container.registerSingleton("repairLoop", (runtime) => {
      return new RepairLoop(runtime.resolve("codexRunner"), runtime.resolve("config"));
    });
    container.registerSingleton("clarificationPlanner", () => new ClarificationPlanner());
  }
};

import type { ClarificationRequest } from "../clarifications/clarificationTypes.js";
import type { AppSpec } from "../specs/specSchema.js";
import { FEATURE_MODULE_CATALOG, type FeatureModuleDefinition, type FeatureModuleId } from "./featureModuleCatalog.js";

export type FeatureModuleSelection = {
  modules: FeatureModuleDefinition[];
  strategyNotes: string[];
};

function isCompatible(module: FeatureModuleDefinition, spec: AppSpec): boolean {
  if (!module.compatibility.appTypes.includes(spec.appType)) {
    return false;
  }

  if (module.compatibility.dataNeeds && !module.compatibility.dataNeeds.includes(spec.dataNeeds)) {
    return false;
  }

  return true;
}

export class FeatureModuleSelector {
  findClarification(spec: AppSpec, rawRequest: string): ClarificationRequest | null {
    for (const module of FEATURE_MODULE_CATALOG) {
      if (!isCompatible(module, spec)) {
        continue;
      }

      if (module.clarificationTrigger?.when === "before_selection" && module.clarificationTrigger.shouldAsk(spec, rawRequest)) {
        return module.clarificationTrigger.buildRequest(spec, rawRequest);
      }
    }

    return null;
  }

  select(spec: AppSpec, rawRequest: string): FeatureModuleSelection {
    const selected = new Map<FeatureModuleId, FeatureModuleDefinition>();
    const strategyNotes: string[] = [];

    const addModule = (moduleId: FeatureModuleId): void => {
      if (selected.has(moduleId)) {
        return;
      }

      const module = FEATURE_MODULE_CATALOG.find((candidate) => candidate.id === moduleId);
      if (!module) {
        throw new Error(`Unknown feature module: ${moduleId}`);
      }

      if (!isCompatible(module, spec)) {
        return;
      }

      for (const dependency of module.dependencies) {
        addModule(dependency);
      }

      selected.set(module.id, module);
      strategyNotes.push(...module.selectionNotes.map((note) => `${module.id}: ${note}`));
    };

    for (const module of FEATURE_MODULE_CATALOG) {
      if (!isCompatible(module, spec)) {
        continue;
      }

      if (module.selectWhen(spec, rawRequest)) {
        addModule(module.id);
      }
    }

    return {
      modules: [...selected.values()],
      strategyNotes
    };
  }
}

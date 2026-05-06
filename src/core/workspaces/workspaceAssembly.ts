import type { BaseTemplateSelection } from "../generation/baseTemplateCatalog.js";
import type { FeatureModuleDefinition } from "../generation/featureModuleCatalog.js";

export type WorkspaceAssemblyPlan = {
  baseTemplate: BaseTemplateSelection;
  featureModules: FeatureModuleDefinition[];
  strategyNotes: string[];
};

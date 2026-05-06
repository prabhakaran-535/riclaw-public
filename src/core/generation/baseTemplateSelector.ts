import type { AppSpec } from "../specs/specSchema.js";
import { BASE_TEMPLATE_CATALOG, type BaseTemplateSelection } from "./baseTemplateCatalog.js";

export class BaseTemplateSelector {
  select(spec: AppSpec): BaseTemplateSelection {
    const selected = BASE_TEMPLATE_CATALOG.find((template) => template.appTypes.includes(spec.appType));
    if (!selected) {
      throw new Error(`No base template found for app type ${spec.appType}.`);
    }

    return {
      ...selected,
      selectedForAppType: spec.appType
    };
  }
}

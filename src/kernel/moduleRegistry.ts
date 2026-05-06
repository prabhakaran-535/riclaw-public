import type { AppContainer, AppModuleDefinition, ServiceMap } from "./contracts.js";
import {
  CircularModuleDependencyError,
  DuplicateModuleError,
  MissingModuleDependencyError
} from "./errors.js";

export class ModuleRegistry<Services extends ServiceMap> {
  private readonly modulesById = new Map<string, AppModuleDefinition<Services>>();
  private readonly enabledModules = new Map<string, AppModuleDefinition<Services>>();
  private registrationOrder: AppModuleDefinition<Services>[] | null = null;

  constructor(modules: ReadonlyArray<AppModuleDefinition<Services>>) {
    for (const module of modules) {
      if (this.modulesById.has(module.id)) {
        throw new DuplicateModuleError(module.id);
      }

      this.modulesById.set(module.id, module);
    }
  }

  registerAll(container: AppContainer<Services>): ReadonlyArray<AppModuleDefinition<Services>> {
    if (this.registrationOrder) {
      return this.registrationOrder;
    }

    for (const module of this.modulesById.values()) {
      const enabled = typeof module.enabled === "function" ? module.enabled(container) : module.enabled ?? true;
      if (enabled) {
        this.enabledModules.set(module.id, module);
      }
    }

    const ordered: AppModuleDefinition<Services>[] = [];
    const visiting = new Set<string>();
    const visited = new Set<string>();

    const visit = (moduleId: string): void => {
      if (visited.has(moduleId)) {
        return;
      }

      if (visiting.has(moduleId)) {
        throw new CircularModuleDependencyError(moduleId);
      }

      const module = this.enabledModules.get(moduleId);
      if (!module) {
        return;
      }

      visiting.add(moduleId);
      for (const dependencyId of module.dependencies) {
        if (!this.enabledModules.has(dependencyId)) {
          throw new MissingModuleDependencyError(module.id, dependencyId);
        }
        visit(dependencyId);
      }
      visiting.delete(moduleId);
      visited.add(moduleId);
      ordered.push(module);
    };

    for (const module of this.enabledModules.values()) {
      visit(module.id);
    }

    for (const module of ordered) {
      module.register(container);
    }

    this.registrationOrder = ordered;
    return ordered;
  }
}

import fs from "node:fs/promises";
import path from "node:path";
import { ProjectManager } from "../../core/projects/projectManager.js";
import { ProjectStorage } from "../../core/projects/projectStorage.js";
import type { AppModuleDefinition } from "../../kernel/contracts.js";
import type { RiclawServices } from "../services.js";

export const storageProjectsModule: AppModuleDefinition<RiclawServices> = {
  id: "storage.projects",
  name: "Project Storage",
  dependencies: ["storage.sqlite"],
  register(container) {
    container.registerSingleton("projectManager", (runtime) => {
      const config = runtime.resolve("config");
      return new ProjectManager(
        runtime.resolve("projectRepository"),
        runtime.resolve("revisionRepository"),
        config.VERCEL_PROJECT_NAME_PREFIX
      );
    });
    container.registerSingleton("projectStorage", (runtime) => new ProjectStorage(runtime.resolve("config")));
    container.onStart(async (runtime) => {
      await fs.mkdir(path.resolve(runtime.resolve("config").PROJECTS_ROOT_PATH), { recursive: true });
    });
  }
};

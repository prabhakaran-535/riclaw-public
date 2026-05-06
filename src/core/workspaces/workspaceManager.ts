import fs from "node:fs/promises";
import path from "node:path";
import type { AppConfig } from "../../config/appConfig.js";
import type { AppSpec } from "../specs/specSchema.js";
import type { WorkspaceAssemblyPlan } from "./workspaceAssembly.js";

async function copyDirectory(source: string, destination: string): Promise<void> {
  await fs.cp(source, destination, { recursive: true, force: true });
}

export class WorkspaceManager {
  constructor(private readonly config: AppConfig) {}

  async assembleWorkspace(jobId: string, plan: WorkspaceAssemblyPlan): Promise<string> {
    const basePath = path.resolve(this.config.JOBS_ROOT_PATH, jobId);
    const workspacePath = path.join(basePath, "workspace");
    await fs.mkdir(basePath, { recursive: true });
    await copyDirectory(path.resolve("templates", "base-nextjs"), workspacePath);
    await copyDirectory(plan.baseTemplate.templatePath, workspacePath);
    for (const featureModule of plan.featureModules) {
      await copyDirectory(featureModule.templatePath, workspacePath);
    }
    return workspacePath;
  }

  async createWorkspaceFromExistingRevision(jobId: string, sourceWorkspacePath: string): Promise<string> {
    const basePath = path.resolve(this.config.JOBS_ROOT_PATH, jobId);
    const workspacePath = path.join(basePath, "workspace");
    await fs.mkdir(basePath, { recursive: true });
    await copyDirectory(sourceWorkspacePath, workspacePath);
    return workspacePath;
  }

  async writeSpec(jobId: string, spec: AppSpec): Promise<string> {
    const specPath = path.resolve(this.config.JOBS_ROOT_PATH, jobId, "spec.json");
    await fs.mkdir(path.dirname(specPath), { recursive: true });
    await fs.writeFile(specPath, JSON.stringify(spec, null, 2), "utf8");
    return specPath;
  }

  async appendLog(jobId: string, stage: string, text: string): Promise<void> {
    const logPath = path.resolve(this.config.JOBS_ROOT_PATH, jobId, "logs", `${stage}.log`);
    await fs.mkdir(path.dirname(logPath), { recursive: true });
    await fs.appendFile(logPath, `${new Date().toISOString()} ${text}\n`, "utf8");
  }
}

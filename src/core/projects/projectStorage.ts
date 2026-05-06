import fs from "node:fs/promises";
import path from "node:path";
import type { AppConfig } from "../../config/appConfig.js";

async function copyDirectory(source: string, destination: string): Promise<void> {
  await fs.cp(source, destination, { recursive: true, force: true });
}

export class ProjectStorage {
  constructor(private readonly config: AppConfig) {}

  getProjectRoot(projectId: string): string {
    return path.resolve(this.config.PROJECTS_ROOT_PATH, projectId);
  }

  getRevisionRoot(projectId: string, revisionId: string): string {
    return path.join(this.getProjectRoot(projectId), "revisions", revisionId);
  }

  getRevisionWorkspacePath(projectId: string, revisionId: string): string {
    return path.join(this.getRevisionRoot(projectId, revisionId), "workspace");
  }

  async persistRevisionWorkspace(projectId: string, revisionId: string, sourceWorkspacePath: string): Promise<string> {
    const revisionRoot = this.getRevisionRoot(projectId, revisionId);
    const revisionWorkspacePath = this.getRevisionWorkspacePath(projectId, revisionId);
    await fs.mkdir(revisionRoot, { recursive: true });
    await fs.rm(revisionWorkspacePath, { recursive: true, force: true });
    await copyDirectory(sourceWorkspacePath, revisionWorkspacePath);
    return revisionWorkspacePath;
  }
}

import { createId } from "../../shared/ids.js";
import type { AppProjectRepository } from "./projectRepository.js";
import type { AppProject } from "./projectTypes.js";
import type { AppRevisionRepository } from "../revisions/revisionRepository.js";
import type { AppRevision } from "../revisions/revisionTypes.js";

function slugifyAppName(appName: string): string {
  const normalized = appName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || "app";
}

export class ProjectManager {
  constructor(
    private readonly projects: AppProjectRepository,
    private readonly revisions: AppRevisionRepository,
    private readonly projectNamePrefix: string
  ) {}

  createProject(input: { userId: string; chatId: string; appName: string }): AppProject {
    const projectId = createId("app");
    const slug = slugifyAppName(input.appName);
    const vercelProjectId = `${this.projectNamePrefix}-${slug}-${projectId.slice(-8)}`;
    return this.projects.create({
      id: projectId,
      userId: input.userId,
      chatId: input.chatId,
      appName: input.appName,
      slug,
      vercelProjectId
    });
  }

  getProject(projectId: string): AppProject {
    return this.projects.getById(projectId);
  }

  findProjectForUser(userId: string, projectKey: string): AppProject | null {
    const trimmedKey = projectKey.trim();
    if (!trimmedKey) {
      return null;
    }

    const bySlug = this.projects.findBySlugForUser(userId, trimmedKey);
    if (bySlug) {
      return bySlug;
    }

    try {
      const project = this.projects.getById(trimmedKey);
      return project.userId === userId ? project : null;
    } catch {
      return null;
    }
  }

  listProjects(): AppProject[] {
    return this.projects.list();
  }

  listProjectsForUser(userId: string): AppProject[] {
    return this.projects.listByUserId(userId);
  }

  createRevision(input: { projectId: string; sourceJobId: string; templateName?: string }): AppRevision {
    return this.revisions.create(input);
  }

  getRevision(revisionId: string): AppRevision {
    return this.revisions.getById(revisionId);
  }

  getRevisionForProject(projectId: string, revisionNumber: number): AppRevision | null {
    return this.revisions.getByProjectAndRevisionNumber(projectId, revisionNumber);
  }

  listRevisionsForProject(projectId: string): AppRevision[] {
    return this.revisions.listByProject(projectId);
  }

  getLatestRevisionForProject(projectId: string): AppRevision | null {
    return this.revisions.getLatestForProject(projectId);
  }

  completeRevision(
    revisionId: string,
    input: { workspacePath: string; deploymentUrl?: string; templateName?: string }
  ): AppRevision {
    const revision = this.revisions.update(revisionId, {
      status: "completed",
      workspacePath: input.workspacePath,
      deploymentUrl: input.deploymentUrl,
      templateName: input.templateName
    });
    this.projects.update(revision.projectId, {
      latestRevisionId: revision.id
    });
    return revision;
  }

  failRevision(revisionId: string): AppRevision {
    return this.revisions.update(revisionId, { status: "failed" });
  }
}

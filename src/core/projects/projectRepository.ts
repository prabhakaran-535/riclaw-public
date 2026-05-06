import type { AppProject } from "./projectTypes.js";

export type CreateAppProjectInput = {
  id?: string;
  userId: string;
  chatId: string;
  appName: string;
  slug: string;
  vercelProjectId: string;
};

export type AppProjectPatch = Partial<AppProject>;

export interface AppProjectRepository {
  create(input: CreateAppProjectInput): AppProject;
  getById(projectId: string): AppProject;
  findBySlugForUser(userId: string, slug: string): AppProject | null;
  update(projectId: string, patch: AppProjectPatch): AppProject;
  list(): AppProject[];
  listByUserId(userId: string): AppProject[];
}

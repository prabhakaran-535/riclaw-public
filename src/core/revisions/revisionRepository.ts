import type { AppRevision } from "./revisionTypes.js";

export type CreateAppRevisionInput = {
  projectId: string;
  sourceJobId: string;
  templateName?: string;
};

export type AppRevisionPatch = Partial<AppRevision>;

export interface AppRevisionRepository {
  create(input: CreateAppRevisionInput): AppRevision;
  getById(revisionId: string): AppRevision;
  getByProjectAndRevisionNumber(projectId: string, revisionNumber: number): AppRevision | null;
  update(revisionId: string, patch: AppRevisionPatch): AppRevision;
  listByProject(projectId: string): AppRevision[];
  getLatestForProject(projectId: string): AppRevision | null;
}

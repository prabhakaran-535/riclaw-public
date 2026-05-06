export type RevisionStatus = "draft" | "completed" | "failed";

export type AppRevision = {
  id: string;
  projectId: string;
  revisionNumber: number;
  sourceJobId: string;
  status: RevisionStatus;
  templateName?: string;
  workspacePath?: string;
  deploymentUrl?: string;
  createdAt: string;
  updatedAt: string;
};

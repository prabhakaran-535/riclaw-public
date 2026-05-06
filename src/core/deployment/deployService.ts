import type { AppSpec } from "../specs/specSchema.js";
import type { VercelClient } from "../../integrations/vercel/vercelClient.js";

export type DeployAppInput = {
  workspacePath: string;
  spec: AppSpec;
  vercelProjectId: string;
};

export type DeploymentResult = {
  success: boolean;
  projectId?: string;
  deploymentId?: string;
  url?: string;
  error?: string;
};

export class DeployService {
  constructor(private readonly vercelClient: VercelClient) {}

  async deploy(input: DeployAppInput): Promise<DeploymentResult> {
    return this.vercelClient.deploy(input);
  }
}

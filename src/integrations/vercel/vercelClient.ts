import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { AppConfig } from "../../config/appConfig.js";
import type { DeployAppInput, DeploymentResult } from "../../core/deployment/deployService.js";

const execFileAsync = promisify(execFile);

function extractDeploymentUrl(output: string): string | undefined {
  const match = output.match(/https:\/\/[a-zA-Z0-9.-]+\.vercel\.app/);
  return match?.[0];
}

export class VercelClient {
  constructor(private readonly config: AppConfig) {}

  async deploy(input: DeployAppInput): Promise<DeploymentResult> {
    const projectId = input.vercelProjectId;
    const args = ["deploy", "--token", this.config.VERCEL_TOKEN, "--yes"];

    if (this.config.VERCEL_DEPLOY_TARGET === "prod") {
      args.push("--prod");
    }

    if (this.config.VERCEL_TEAM_ID) {
      args.push("--scope", this.config.VERCEL_TEAM_ID);
    }

    try {
      const { stdout, stderr } = await execFileAsync(this.config.VERCEL_COMMAND, args, {
        cwd: input.workspacePath
      });
      const combinedOutput = [stdout, stderr].filter(Boolean).join("\n");
      const url = extractDeploymentUrl(combinedOutput);

      if (!url) {
        return {
          success: false,
          projectId,
          error: `Vercel command ran but no deployment URL was found.\n${combinedOutput}`
        };
      }

      return {
        success: true,
        projectId,
        deploymentId: url,
        url
      };
    } catch (error) {
      const err = error as Error & { stdout?: string; stderr?: string };
      return {
        success: false,
        projectId,
        error: [err.message, err.stdout, err.stderr].filter(Boolean).join("\n")
      };
    }
  }
}

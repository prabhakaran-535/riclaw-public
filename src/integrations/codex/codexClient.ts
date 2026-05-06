import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import type { AppConfig } from "../../config/appConfig.js";
import type { AppSpec } from "../../core/specs/specSchema.js";
import type { GenerationPhase } from "../../core/generation/generationPlanner.js";

const execFileAsync = promisify(execFile);
const CODEX_EXEC_MAX_BUFFER_BYTES = 20 * 1024 * 1024;

type CodexRunInput = {
  jobId: string;
  workspacePath: string;
  phase: GenerationPhase;
  spec: AppSpec;
  extraContext?: string;
};

type CodexPlanInput = {
  rawRequest: string;
};

export class CodexClient {
  private readonly activeRuns = new Map<string, ReturnType<typeof spawn>>();

  constructor(private readonly config: AppConfig) {}

  private async exec(args: string[], cwd?: string): Promise<string> {
    try {
      const { stdout, stderr } = await execFileAsync(this.config.CODEX_COMMAND, args, {
        cwd,
        maxBuffer: CODEX_EXEC_MAX_BUFFER_BYTES,
        timeout: this.config.CODEX_EXEC_TIMEOUT_MS
      });
      return [stdout, stderr].filter(Boolean).join("\n").trim();
    } catch (error) {
      const err = error as Error & { stdout?: string; stderr?: string };
      throw new Error([err.message, err.stdout, err.stderr].filter(Boolean).join("\n"));
    }
  }

  private appendChunk(parts: string[], chunk: string): void {
    if (!chunk) {
      return;
    }

    parts.push(chunk);
    let totalLength = parts.reduce((sum, part) => sum + part.length, 0);
    while (totalLength > CODEX_EXEC_MAX_BUFFER_BYTES && parts.length > 1) {
      const removed = parts.shift();
      totalLength -= removed?.length ?? 0;
    }
  }

  private runStreaming(input: CodexRunInput, prompt: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const child = spawn(
        this.config.CODEX_COMMAND,
        ["exec", "--skip-git-repo-check", "--sandbox", "workspace-write", prompt],
        { cwd: input.workspacePath, stdio: ["ignore", "pipe", "pipe"] }
      );

      const stdoutParts: string[] = [];
      const stderrParts: string[] = [];
      let settled = false;

      const finish = (error?: Error) => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timeout);
        this.activeRuns.delete(input.jobId);
        if (error) {
          reject(error);
          return;
        }
        resolve();
      };

      const timeout = setTimeout(() => {
        child.kill("SIGTERM");
        finish(new Error(`Codex execution timed out after ${this.config.CODEX_EXEC_TIMEOUT_MS}ms.`));
      }, this.config.CODEX_EXEC_TIMEOUT_MS);

      this.activeRuns.set(input.jobId, child);

      child.stdout.on("data", (chunk: Buffer) => {
        this.appendChunk(stdoutParts, chunk.toString("utf8"));
      });

      child.stderr.on("data", (chunk: Buffer) => {
        this.appendChunk(stderrParts, chunk.toString("utf8"));
      });

      child.on("error", (error) => {
        finish(error);
      });

      child.on("close", (code, signal) => {
        if (code === 0) {
          finish();
          return;
        }

        const output = [...stdoutParts, ...stderrParts].filter(Boolean).join("\n").trim();
        if (signal === "SIGTERM") {
          finish(new Error("Codex execution cancelled."));
          return;
        }

        finish(
          new Error(
            [`Codex exited with code ${code ?? "unknown"}${signal ? ` and signal ${signal}` : ""}.`, output]
              .filter(Boolean)
              .join("\n")
          )
        );
      });
    });
  }

  async run(input: CodexRunInput): Promise<void> {
    if (this.config.CODEX_EXECUTION_MODE === "api") {
      return;
    }

    const prompt = [
      `Phase: ${input.phase}`,
      `App name: ${input.spec.appName}`,
      `Summary: ${input.spec.summary}`,
      `Features: ${input.spec.features.join(", ")}`,
      input.extraContext?.trim() ? `Context:\n${input.extraContext.trim()}` : undefined
    ]
      .filter(Boolean)
      .join("\n");

    try {
      await this.runStreaming(input, prompt);
    } catch (error) {
      throw new Error(
        [`Codex execution failed for phase ${input.phase}.`, error instanceof Error ? error.message : String(error)]
          .filter(Boolean)
          .join("\n")
      );
    }
  }

  cancel(jobId: string): boolean {
    const child = this.activeRuns.get(jobId);
    if (!child) {
      return false;
    }

    child.kill("SIGTERM");
    return true;
  }

  async planSpec(input: CodexPlanInput): Promise<string> {
    if (this.config.CODEX_EXECUTION_MODE === "api") {
      throw new Error("API planning mode is not implemented yet.");
    }

    const prompt = [
      "You are planning a small Vercel-deployed web app from a user's Telegram request.",
      "Return JSON only. No markdown fences. No commentary.",
      "Use this exact schema:",
      JSON.stringify(
        {
          appName: "string",
          appType: "landing_page | booking_app | crud_dashboard | internal_tool",
          summary: "string",
          targetUsers: ["string"],
          features: ["string"],
          pages: ["string"],
          authRequired: false,
          dataNeeds: "none | mock | basic_persistence",
          stylingNotes: ["string"],
          assumptions: ["string"]
        },
        null,
        2
      ),
      "Keep the scope realistic for a lightweight first version.",
      "If the request is ambiguous, make reasonable assumptions and record them in assumptions.",
      `User request: ${input.rawRequest}`
    ].join("\n\n");

    return this.exec(["exec", "--skip-git-repo-check", "--sandbox", "workspace-write", prompt]);
  }
}

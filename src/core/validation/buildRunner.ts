import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type CommandResult = {
  ok: boolean;
  output: string;
  exitCode: number;
};

export class BuildRunner {
  async runCommand(command: string, args: string[], cwd: string): Promise<CommandResult> {
    try {
      const { stdout, stderr } = await execFileAsync(command, args, { cwd });
      return { ok: true, output: `${stdout}\n${stderr}`.trim(), exitCode: 0 };
    } catch (error) {
      const err = error as Error & { stdout?: string; stderr?: string; code?: number };
      return {
        ok: false,
        output: [err.message, err.stdout, err.stderr].filter(Boolean).join("\n"),
        exitCode: typeof err.code === "number" ? err.code : 1
      };
    }
  }
}

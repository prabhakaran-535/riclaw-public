import fs from "node:fs/promises";
import path from "node:path";
import { BuildRunner } from "./buildRunner.js";
import { SmokeTester } from "./smokeTester.js";
import type { ValidationResult, ValidationStepResult } from "./validationTypes.js";

type PackageScripts = Record<string, string>;

async function readScripts(workspacePath: string): Promise<PackageScripts> {
  const packageJsonPath = path.join(workspacePath, "package.json");
  const raw = await fs.readFile(packageJsonPath, "utf8");
  const parsed = JSON.parse(raw) as { scripts?: PackageScripts };
  return parsed.scripts ?? {};
}

async function shouldInstallDependencies(workspacePath: string): Promise<boolean> {
  const nodeModulesPath = path.join(workspacePath, "node_modules");
  const packageJsonPath = path.join(workspacePath, "package.json");
  const packageLockPath = path.join(workspacePath, "package-lock.json");

  const [nodeModulesStat, packageJsonStat, packageLockStat] = await Promise.all([
    fs.stat(nodeModulesPath).catch(() => null),
    fs.stat(packageJsonPath).catch(() => null),
    fs.stat(packageLockPath).catch(() => null)
  ]);

  if (!nodeModulesStat) {
    return true;
  }

  const nodeModulesMtime = nodeModulesStat.mtimeMs;
  return [packageJsonStat, packageLockStat].some((stat) => Boolean(stat && stat.mtimeMs > nodeModulesMtime));
}

async function clearNextBuildArtifacts(workspacePath: string): Promise<void> {
  await fs.rm(path.join(workspacePath, ".next"), { recursive: true, force: true });
}

export class Validator {
  constructor(
    private readonly buildRunner: BuildRunner,
    private readonly smokeTester: SmokeTester
  ) {}

  async validateWorkspace(workspacePath: string): Promise<ValidationResult> {
    const scripts = await readScripts(workspacePath);
    const steps: ValidationStepResult[] = [];

    const installNeeded = await shouldInstallDependencies(workspacePath);
    const install = installNeeded
      ? await this.buildRunner.runCommand("npm", ["install"], workspacePath)
      : { ok: true, output: "Skipped because node_modules is already present and manifests are unchanged.", exitCode: 0 };
    steps.push({ name: "install", ok: install.ok, output: install.output });

    const lint = install.ok
      ? scripts.lint
        ? await this.buildRunner.runCommand("npm", ["run", "lint"], workspacePath)
        : { ok: true, output: "Skipped because no lint script exists.", exitCode: 0 }
      : { ok: false, output: "Skipped because install failed.", exitCode: 1 };
    steps.push({
      name: "lint",
      ok: install.ok ? lint.ok : false,
      output: lint.output,
      skipped: !scripts.lint
    });

    const typecheck = install.ok
      ? scripts.typecheck
        ? await this.buildRunner.runCommand("npm", ["run", "typecheck"], workspacePath)
        : { ok: true, output: "Skipped because no typecheck script exists.", exitCode: 0 }
      : { ok: false, output: "Skipped because install failed.", exitCode: 1 };
    steps.push({
      name: "typecheck",
      ok: install.ok ? typecheck.ok : false,
      output: typecheck.output,
      skipped: !scripts.typecheck
    });

    const build = install.ok && lint.ok && typecheck.ok
      ? scripts.build
        ? (await clearNextBuildArtifacts(workspacePath),
          await this.buildRunner.runCommand("npm", ["run", "build"], workspacePath))
        : { ok: false, output: "No build script exists.", exitCode: 1 }
      : { ok: false, output: "Skipped because an earlier validation step failed.", exitCode: 1 };
    steps.push({
      name: "build",
      ok: install.ok && lint.ok && typecheck.ok ? build.ok : false,
      output: build.output,
      skipped: !scripts.build
    });

    const smoke = build.ok
      ? await this.smokeTester.check(workspacePath)
      : { ok: false, notes: ["Skipped because build failed or was skipped."] };
    steps.push({
      name: "smoke",
      ok: smoke.ok,
      output: smoke.notes.join("\n")
    });

    return {
      passed: install.ok && lint.ok && typecheck.ok && build.ok && smoke.ok,
      installPassed: install.ok,
      lintPassed: lint.ok,
      typecheckPassed: typecheck.ok,
      testsPassed: true,
      buildPassed: build.ok,
      smokePassed: smoke.ok,
      steps,
      smoke,
      errors: steps.filter((step) => !step.ok && !step.skipped).map((step) => `${step.name}: ${step.output}`)
    };
  }
}

import fs from "node:fs/promises";
import path from "node:path";
import type { SmokeCheckResult } from "./validationTypes.js";

async function exists(target: string): Promise<boolean> {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

export class SmokeTester {
  async check(workspacePath: string): Promise<SmokeCheckResult> {
    const requiredFiles = [
      "package.json",
      "app/layout.tsx",
      "app/page.tsx",
      "app/generated/metadata.ts",
      "app/generated/pageContent.ts",
      "next.config.mjs"
    ];

    const notes: string[] = [];
    let ok = true;

    for (const file of requiredFiles) {
      const fullPath = path.join(workspacePath, file);
      const present = await exists(fullPath);
      notes.push(`${present ? "OK" : "MISSING"} ${file}`);
      if (!present) {
        ok = false;
      }
    }

    return { ok, notes };
  }
}

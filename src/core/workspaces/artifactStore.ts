import fs from "node:fs/promises";
import path from "node:path";
import type { AppConfig } from "../../config/appConfig.js";

export class ArtifactStore {
  constructor(private readonly config: AppConfig) {}

  async save(jobId: string, name: string, content: string): Promise<string> {
    const filePath = path.resolve(this.config.JOBS_ROOT_PATH, jobId, "artifacts", name);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content, "utf8");
    return filePath;
  }

  async saveJson(jobId: string, name: string, value: unknown): Promise<string> {
    return this.save(jobId, name, JSON.stringify(value, null, 2));
  }
}

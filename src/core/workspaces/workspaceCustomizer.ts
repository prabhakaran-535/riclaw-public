import fs from "node:fs/promises";
import path from "node:path";
import type { AppSpec } from "../specs/specSchema.js";
import type { WorkspaceAssemblyPlan } from "./workspaceAssembly.js";

function toArrayLiteral(values: string[]): string {
  return JSON.stringify(values, null, 2);
}

function buildHeadline(spec: AppSpec): string {
  switch (spec.appType) {
    case "booking_app":
      return `Book and manage ${spec.appName.toLowerCase()} with less friction.`;
    case "crud_dashboard":
      return `Operate ${spec.appName.toLowerCase()} from one clean dashboard.`;
    case "internal_tool":
      return `Keep ${spec.appName.toLowerCase()} moving with an internal tool that fits the workflow.`;
    default:
      return `Launch ${spec.appName} with a clear story and a real working app.`;
  }
}

function buildEyebrow(spec: AppSpec): string {
  switch (spec.appType) {
    case "booking_app":
      return "Booking App";
    case "crud_dashboard":
      return "CRUD Dashboard";
    case "internal_tool":
      return "Internal Tool";
    default:
      return "Landing Page";
  }
}

function buildPrimaryCta(spec: AppSpec): string {
  switch (spec.appType) {
    case "booking_app":
      return "View booking flow";
    case "crud_dashboard":
      return "See dashboard";
    case "internal_tool":
      return "Review workflow";
    default:
      return "Explore features";
  }
}

function buildSecondaryCta(spec: AppSpec): string {
  return spec.authRequired ? "Plan access" : "View assumptions";
}

export class WorkspaceCustomizer {
  async applySpec(workspacePath: string, spec: AppSpec, assemblyPlan: WorkspaceAssemblyPlan): Promise<void> {
    const generatedDir = path.join(workspacePath, "app", "generated");
    await fs.mkdir(generatedDir, { recursive: true });

    const pageContent = `export const pageContent = {
  appName: ${JSON.stringify(spec.appName)},
  appType: ${JSON.stringify(spec.appType)},
  eyebrow: ${JSON.stringify(buildEyebrow(spec))},
  headline: ${JSON.stringify(buildHeadline(spec))},
  summary: ${JSON.stringify(spec.summary)},
  primaryCta: ${JSON.stringify(buildPrimaryCta(spec))},
  secondaryCta: ${JSON.stringify(buildSecondaryCta(spec))},
  targetUsers: ${toArrayLiteral(spec.targetUsers)},
  features: ${toArrayLiteral(spec.features)},
  pages: ${toArrayLiteral(spec.pages)},
  stylingNotes: ${toArrayLiteral(spec.stylingNotes)},
  assumptions: ${toArrayLiteral(spec.assumptions)}
} as const;
`;

    const metadataContent = `export const generatedMetadata = {
  title: ${JSON.stringify(spec.appName)},
  description: ${JSON.stringify(spec.summary)}
} as const;
`;

    const assemblyContent = `export const workspaceAssembly = {
  baseTemplate: ${JSON.stringify(assemblyPlan.baseTemplate.id)},
  featureModules: ${JSON.stringify(assemblyPlan.featureModules.map((module) => module.id), null, 2)},
  strategyNotes: ${JSON.stringify(assemblyPlan.strategyNotes, null, 2)}
} as const;
`;

    await fs.writeFile(path.join(generatedDir, "pageContent.ts"), pageContent, "utf8");
    await fs.writeFile(path.join(generatedDir, "metadata.ts"), metadataContent, "utf8");
    await fs.writeFile(path.join(generatedDir, "assembly.ts"), assemblyContent, "utf8");
  }
}

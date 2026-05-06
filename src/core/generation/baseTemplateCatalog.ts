import path from "node:path";
import type { AppSpec } from "../specs/specSchema.js";

export type BaseTemplateId = "landing-page" | "booking-app" | "crud-dashboard" | "internal-tool";

export type BaseTemplateDefinition = {
  id: BaseTemplateId;
  appTypes: AppSpec["appType"][];
  templatePath: string;
  strategyNotes: string[];
};

export type BaseTemplateSelection = BaseTemplateDefinition & {
  selectedForAppType: AppSpec["appType"];
};

export const BASE_TEMPLATE_CATALOG: BaseTemplateDefinition[] = [
  {
    id: "landing-page",
    appTypes: ["landing_page"],
    templatePath: path.resolve("templates", "landing-page"),
    strategyNotes: ["Uses the marketing-oriented landing page starting point."]
  },
  {
    id: "booking-app",
    appTypes: ["booking_app"],
    templatePath: path.resolve("templates", "booking-app"),
    strategyNotes: ["Uses the booking app starting point for reservation-oriented flows."]
  },
  {
    id: "crud-dashboard",
    appTypes: ["crud_dashboard"],
    templatePath: path.resolve("templates", "crud-dashboard"),
    strategyNotes: ["Uses the CRUD dashboard starting point for record-heavy operator workflows."]
  },
  {
    id: "internal-tool",
    appTypes: ["internal_tool"],
    templatePath: path.resolve("templates", "internal-tool"),
    strategyNotes: ["Uses the internal tool starting point for operational team workflows."]
  }
];

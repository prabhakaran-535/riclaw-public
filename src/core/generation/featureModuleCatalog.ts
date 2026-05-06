import path from "node:path";
import { hasClarificationSignal } from "../clarifications/clarificationSignals.js";
import type { ClarificationRequest } from "../clarifications/clarificationTypes.js";
import type { AppSpec } from "../specs/specSchema.js";

export type FeatureModuleId =
  | "admin-auth"
  | "basic-record-storage"
  | "payments-foundation"
  | "mock-payments";

export type FeatureModuleDefinition = {
  id: FeatureModuleId;
  displayName: string;
  description: string;
  templatePath: string;
  dependencies: FeatureModuleId[];
  compatibility: {
    appTypes: AppSpec["appType"][];
    dataNeeds?: AppSpec["dataNeeds"][];
  };
  selectionNotes: string[];
  selectWhen(spec: AppSpec, rawRequest: string): boolean;
  clarificationTrigger?: {
    when: "before_selection";
    shouldAsk(spec: AppSpec, rawRequest: string): boolean;
    buildRequest(spec: AppSpec, rawRequest: string): ClarificationRequest;
  };
};

function mentions(text: string, pattern: RegExp): boolean {
  return pattern.test(text);
}

function hasPaymentIntent(spec: AppSpec, rawRequest: string): boolean {
  return (
    spec.features.some((feature) => /\bpayment|checkout|purchase\b/i.test(feature)) ||
    mentions(rawRequest, /\bpayment|checkout|purchase|pay\b/i)
  );
}

export const FEATURE_MODULE_CATALOG: FeatureModuleDefinition[] = [
  {
    id: "admin-auth",
    displayName: "Admin Auth",
    description: "Adds a minimal auth-oriented scaffold and guidance for protected operator workflows.",
    templatePath: path.resolve("feature-modules", "admin-auth"),
    dependencies: [],
    compatibility: {
      appTypes: ["booking_app", "crud_dashboard", "internal_tool"]
    },
    selectionNotes: ["Selected when the app requires authenticated operator access."],
    selectWhen(spec) {
      return spec.authRequired;
    }
  },
  {
    id: "basic-record-storage",
    displayName: "Basic Record Storage",
    description: "Adds a starter persistence-oriented scaffold for apps that manage records over time.",
    templatePath: path.resolve("feature-modules", "basic-record-storage"),
    dependencies: [],
    compatibility: {
      appTypes: ["booking_app", "crud_dashboard", "internal_tool"],
      dataNeeds: ["basic_persistence"]
    },
    selectionNotes: ["Selected when the app needs basic persistence instead of a mock-only flow."],
    selectWhen(spec) {
      return spec.dataNeeds === "basic_persistence";
    }
  },
  {
    id: "payments-foundation",
    displayName: "Payments Foundation",
    description: "Adds checkout-oriented placeholder structure for apps that mention purchases or payments.",
    templatePath: path.resolve("feature-modules", "payments-foundation"),
    dependencies: [],
    compatibility: {
      appTypes: ["landing_page", "booking_app"]
    },
    selectionNotes: ["Selected when the app mentions payments, checkout, or purchases."],
    selectWhen(spec, rawRequest) {
      return hasPaymentIntent(spec, rawRequest);
    },
    clarificationTrigger: {
      when: "before_selection",
      shouldAsk(spec, rawRequest) {
        return (
          hasPaymentIntent(spec, rawRequest) &&
          !hasClarificationSignal(rawRequest, "payment_tracking_only", "payment_real_online")
        );
      },
      buildRequest() {
        return {
          stage: "generating",
          question: "Should RIClaw keep payments mock-only for now, or build a real payment integration?",
          options: ["Mock payment flow only", "Real payment integration"]
        };
      }
    }
  },
  {
    id: "mock-payments",
    displayName: "Mock Payments",
    description: "Adds a lightweight mock checkout flow for first-version payment experiences.",
    templatePath: path.resolve("feature-modules", "mock-payments"),
    dependencies: ["payments-foundation"],
    compatibility: {
      appTypes: ["landing_page", "booking_app"],
      dataNeeds: ["mock"]
    },
    selectionNotes: ["Selected when payments are in scope but the build stays mock-only for now."],
    selectWhen(spec, rawRequest) {
      return (
        hasPaymentIntent(spec, rawRequest) &&
        (spec.dataNeeds === "mock" || hasClarificationSignal(rawRequest, "payment_tracking_only"))
      );
    }
  }
];

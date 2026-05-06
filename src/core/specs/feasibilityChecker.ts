import type { AppSpec } from "./specSchema.js";

export type FeasibilityResult = {
  allowed: boolean;
  reason?: string;
  riskLevel: "low" | "medium" | "high";
};

export class FeasibilityChecker {
  check(spec: AppSpec): FeasibilityResult {
    const hasSensitiveFeature = spec.features.some((feature) => /bank|medical|legal/i.test(feature));
    if (hasSensitiveFeature) {
      return {
        allowed: false,
        reason: "The request appears to require a sensitive or unsupported feature.",
        riskLevel: "high"
      };
    }

    return {
      allowed: true,
      riskLevel:
        spec.authRequired || spec.features.some((feature) => /payment/i.test(feature)) ? "medium" : "low"
    };
  }
}

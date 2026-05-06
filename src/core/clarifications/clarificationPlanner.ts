import type { AppSpec } from "../specs/specSchema.js";
import type { ValidationResult } from "../validation/validationTypes.js";
import { hasClarificationSignal } from "./clarificationSignals.js";
import type { ClarificationRequest } from "./clarificationTypes.js";

function mentions(text: string, pattern: RegExp): boolean {
  return pattern.test(text);
}

function hasResolvedPaymentIntent(rawRequest: string): boolean {
  if (hasClarificationSignal(rawRequest, "payment_tracking_only", "payment_real_online")) {
    return true;
  }

  return mentions(
    rawRequest,
    /\bonly track\b|\btrack orders?\b|\bpayment status\b|\bwithout charging\b|\bno online payments?\b|\bmanual payments?\b|\boffline payments?\b|\bcash\b|\bbank transfer\b|\binvoice\b|\bonline payments?\b|\breal payments?\b|\bpayment integration\b|\baccept payments?\b|\baccept real online payments?\b/i
  );
}

function hasResolvedAuthIntent(rawRequest: string): boolean {
  if (hasClarificationSignal(rawRequest, "auth_admins_only", "auth_admins_and_customers")) {
    return true;
  }

  return mentions(
    rawRequest,
    /\badmins only\b|\bonly admins\b|\bboth admins and customers\b|\bboth admins and users\b|\bboth admins and clients\b|\bcustomers can log in\b|\busers can log in\b|\bclients can log in\b|\bcustomer login\b|\badmin login\b|\blogin access\b/i
  );
}

export class ClarificationPlanner {
  forRawRequest(rawRequest: string): ClarificationRequest | null {
    if (
      mentions(rawRequest, /\bpayment|pay|checkout|purchase\b/i) &&
      !mentions(rawRequest, /\bmanual|offline|cash|bank transfer|invoice|stripe|paynow|card\b/i) &&
      !hasResolvedPaymentIntent(rawRequest)
    ) {
      return {
        stage: "specifying",
        question: "How should payments work in this first version?",
        options: [
          "Track orders and payment status only",
          "Accept real online payments"
        ]
      };
    }

    if (
      mentions(rawRequest, /\badmin\b/i) &&
      mentions(rawRequest, /\bclient|customer|user\b/i) &&
      !mentions(rawRequest, /\blogin|auth|sign in|account\b/i) &&
      !hasResolvedAuthIntent(rawRequest)
    ) {
      return {
        stage: "specifying",
        question: "Who needs login access in this app?",
        options: [
          "Admins only",
          "Both admins and customers"
        ]
      };
    }

    return null;
  }

  forSpec(spec: AppSpec, rawRequest?: string): ClarificationRequest | null {
    if (rawRequest && hasResolvedPaymentIntent(rawRequest)) {
      return null;
    }

    if (
      spec.features.some((feature) => /\bpayment|checkout\b/i.test(feature)) &&
      spec.dataNeeds === "mock"
    ) {
      return {
        stage: "generating",
        question: "Should RIClaw keep payments mock-only for now, or build a real payment integration?",
        options: [
          "Mock payment flow only",
          "Real payment integration"
        ]
      };
    }

    return null;
  }

  forValidation(validation: ValidationResult): ClarificationRequest | null {
    const combinedErrors = validation.errors.join("\n");
    if (mentions(combinedErrors, /\benvironment variable\b|\bapi key\b|\btoken\b/i)) {
      return {
        stage: "validating",
        question: "The app needs extra credentials to continue. What should RIClaw do?",
        options: [
          "Keep this version mock-only",
          "Wait for the required credentials"
        ]
      };
    }

    return null;
  }
}

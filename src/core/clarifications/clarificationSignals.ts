import type { ClarificationStage } from "./clarificationTypes.js";

export type ClarificationSignal =
  | "payment_tracking_only"
  | "payment_real_online"
  | "auth_admins_only"
  | "auth_admins_and_customers";

const KNOWN_SIGNALS = new Set<ClarificationSignal>([
  "payment_tracking_only",
  "payment_real_online",
  "auth_admins_only",
  "auth_admins_and_customers"
]);

function normalizeText(text: string | undefined): string {
  return (text ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function matchesAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

function isPaymentQuestion(question: string): boolean {
  return matchesAny(question, [
    /\bpayments?\b.*\bfirst version\b/,
    /\bpayment integration\b/,
    /\bpayments?\b.*\bmock-only\b/
  ]);
}

function isAuthQuestion(question: string): boolean {
  return matchesAny(question, [
    /\bwho needs login access\b/,
    /\blogin access\b/,
    /\bwho can log in\b/
  ]);
}

function inferSignals(question: string | undefined, answer: string): ClarificationSignal[] {
  const normalizedQuestion = normalizeText(question);
  const normalizedAnswer = normalizeText(answer);
  const signals: ClarificationSignal[] = [];

  if (isPaymentQuestion(normalizedQuestion)) {
    if (
      matchesAny(normalizedAnswer, [
        /\btrack\b/,
        /\bpayment status\b/,
        /\bmock\b/,
        /\bmanual\b/,
        /\boffline\b/,
        /\bwithout charging\b/,
        /\bno online\b/
      ])
    ) {
      signals.push("payment_tracking_only");
    }

    if (
      matchesAny(normalizedAnswer, [
        /\breal\b/,
        /\bonline\b/,
        /\blive\b/,
        /\bintegration\b/,
        /\baccept\b/,
        /\bcharge\b/,
        /\bcheckout\b/,
        /\bstripe\b/,
        /\bpaynow\b/,
        /\bcard\b/
      ])
    ) {
      signals.push("payment_real_online");
    }
  }

  if (isAuthQuestion(normalizedQuestion)) {
    if (matchesAny(normalizedAnswer, [/\badmins?\s+only\b/, /\bonly admins?\b/])) {
      signals.push("auth_admins_only");
    }

    if (
      matchesAny(normalizedAnswer, [
        /\bboth\b.*\badmins?\b.*\b(customers?|users?|clients?)\b/,
        /\bboth\b.*\b(customers?|users?|clients?)\b.*\badmins?\b/,
        /\b(customers?|users?|clients?) can log in\b/
      ])
    ) {
      signals.push("auth_admins_and_customers");
    }
  }

  return [...new Set(signals)];
}

export function formatClarificationForRawRequest(input: {
  stage?: ClarificationStage;
  question?: string;
  answer: string;
}): string {
  const lines = ["Clarification from user:"];

  if (input.stage) {
    lines.push(`Stage: ${input.stage}`);
  }

  if (input.question?.trim()) {
    lines.push(`Question: ${input.question.trim()}`);
  }

  lines.push(`Answer: ${input.answer.trim()}`);

  for (const signal of inferSignals(input.question, input.answer)) {
    lines.push(`Clarification signal: ${signal}`);
  }

  return lines.join("\n");
}

export function hasClarificationSignal(rawRequest: string, ...signals: ClarificationSignal[]): boolean {
  if (signals.length === 0) {
    return false;
  }

  const present = new Set<ClarificationSignal>();
  for (const match of rawRequest.matchAll(/^Clarification signal:\s*([a-z_]+)\s*$/gim)) {
    const candidate = match[1] as ClarificationSignal;
    if (KNOWN_SIGNALS.has(candidate)) {
      present.add(candidate);
    }
  }

  return signals.some((signal) => present.has(signal));
}

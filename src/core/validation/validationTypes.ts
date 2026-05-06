export type ValidationStepResult = {
  name: "install" | "lint" | "typecheck" | "build" | "smoke";
  ok: boolean;
  output: string;
  skipped?: boolean;
};

export type SmokeCheckResult = {
  ok: boolean;
  notes: string[];
};

export type ValidationResult = {
  passed: boolean;
  installPassed: boolean;
  lintPassed: boolean;
  typecheckPassed: boolean;
  testsPassed: boolean;
  buildPassed: boolean;
  smokePassed: boolean;
  steps: ValidationStepResult[];
  smoke: SmokeCheckResult;
  errors: string[];
};

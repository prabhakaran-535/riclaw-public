# RIClaw Architecture

## Runtime modules

- `Telegram route/poller`: receives user prompts and normalizes them into `TelegramMessage`.
- `JobManager`: creates and updates jobs.
- `JobRunner`: runs the end-to-end pipeline for one job.
- `SpecExtractor`: asks Codex for a JSON `AppSpec`, validates it against the schema, and falls back to heuristics if needed.
- `FeasibilityChecker`: keeps unsupported requests out of the build pipeline.
- `TemplateSelector`: chooses a Vercel-friendly starter app.
- `WorkspaceManager`: creates isolated directories per job by copying `templates/base-nextjs` and then the selected overlay.
- `WorkspaceCustomizer`: writes spec-driven content files into the copied app before Codex begins implementation.
- `CodexRunner`: runs staged code-generation and fix passes.
- `Validator`: runs install, lint, typecheck, build, and filesystem smoke checks, then returns a structured validation report.
- `DeployService`: triggers Vercel deployment.
- `LiveVerifier`: confirms the final URL is reachable.
- `TelegramNotifier`: sends updates and final links back to the user.

## Job states

- `received`
- `specifying`
- `rejected`
- `generating`
- `validating`
- `repairing`
- `deploying`
- `verifying`
- `completed`
- `failed`

## Recommended v1 constraints

- support one frontend stack: Next.js + TypeScript
- support a small number of app archetypes
- keep one active build at a time on the Raspberry Pi
- avoid arbitrary third-party integrations until the core loop is stable
- preserve validation artifacts per job so failures can be inspected after the fact

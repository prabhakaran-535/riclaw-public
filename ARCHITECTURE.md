# ARCHITECTURE.md

## Overview

RIClaw is a Telegram-driven app generation system.

A user interacts with RIClaw through Telegram to:
1. request a new app,
2. answer clarifying questions,
3. check progress,
4. stop a running build,
5. request changes to an existing app,
6. browse their apps and revisions,
7. roll back to a previous revision.

RIClaw then:
1. extracts structured intent,
2. selects a base template,
3. selects feature modules,
4. assembles a working app workspace,
5. uses Codex to adapt and complete the app,
6. validates and repairs if needed,
7. deploys the result,
8. stores the app as a project with revision history.

## Core Architectural Principles

### Telegram is transport only
Telegram receives messages, parses commands/replies/buttons, and calls application use-cases.

### Jobs are execution, projects are product identity
RIClaw separates:
- `AppProject`
- `AppRevision`
- `BuildJob`
- `PendingEditRequest`

### Persistence is behind repositories
Application and domain logic should depend on repository interfaces, not raw SQLite access.

### Revisions are append-only
Edits and rollback create new revisions.

### Reuse before generation
RIClaw should prefer:
- base templates
- feature modules
- Codex adaptation

## Suggested Implementation Order

1. core kernel + module registry
2. repository interfaces + SQLite adapters
3. project/revision model + storage layout
4. queue/progress/cancel
5. Telegram transport refactor
6. template + feature-module assembly
7. reply-based edit requests + confirmation
8. app library + revision history + rollback
9. final integration pass

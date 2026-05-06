# AGENTS.md

## Purpose

RIClaw is a Telegram-driven app generation system.

A user describes an app in Telegram. RIClaw:
1. collects the request,
2. asks clarifying questions when needed,
3. assembles a starting app from templates and feature modules,
4. uses Codex to adapt and complete the app,
5. validates the result,
6. deploys it,
7. sends the result back to the user,
8. supports future edits as revisions of the same app.

This repository should be treated as a modular monolith with strict boundaries.

## Core Architecture Rules

### 1. Telegram is transport only
Telegram handlers must not directly own business logic for:
- build orchestration
- deployment
- validation
- project/revision management
- database persistence

Telegram should parse input, route commands, and call application use-cases.

### 2. Jobs are execution records, not app identity
Use:
- `AppProject` for durable app identity
- `AppRevision` for version history
- `BuildJob` for execution state
- `PendingEditRequest` for reply-based edit confirmation state

### 3. All persistence goes through repositories
Do not add direct SQLite calls in domain or application logic.

### 4. Prefer module boundaries over shared logic sprawl
Expected modules include:
- `transport.telegram`
- `auth.access`
- `projects`
- `revisions`
- `jobs.orchestration`
- `clarifications`
- `templates`
- `feature-modules`
- `generation`
- `validation`
- `deployment`
- `storage.projects`

### 5. Build from templates and feature modules first
Preferred flow:
1. extract structured app spec
2. select base template
3. select feature modules
4. assemble workspace
5. use Codex for adaptation, glue, polish, and repair

### 6. Revisions are append-only
Edits and rollback must create new revisions.

### 7. Stable app identity matters
Each app should map to one persistent project identity and one persistent Vercel project identity.

### 8. One active or pending change per app
Only one active build, revision, or pending edit confirmation should exist per app project at a time.

## Anti-Bloat Rules

### Do not do these
- Do not add more orchestration logic directly into Telegram handlers.
- Do not add product history fields to jobs if they belong to projects or revisions.
- Do not bypass repositories with raw DB access.
- Do not add ad hoc flags when a new domain model is needed.
- Do not solve every new app type with larger Codex prompts alone.
- Do not mix transport formatting with business rules.

### Prefer these
- Add a use-case.
- Add a repository interface.
- Add or extend a module.
- Add a template or feature module.
- Add a project/revision concept when product history is involved.

## Queue and Execution Rules

- Use one global queue in v1.
- Use explicit job states.
- Keep concurrency at 1.

## Verification Requirements

After any meaningful change:
1. run `npm run build`
2. summarize what changed
3. note any deferred work or known limitations



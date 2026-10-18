<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# ITERRA project rules

These rules apply to every AI agent and every person working in this repo.
`CLAUDE.md` only points here, so this file is the single source. Change it
through the lead.

## Scope

- Do only what the task says. A task names its requirement, its files and its checks.
- Sources of truth, in order: the requirement register in `docs/pm/` once it exists, the spec in `docs/superpowers/specs/`, the plan in `docs/superpowers/plans/`, then `design.md`.
- If there is no task, or the task does not cover what you are about to do, stop and ask the lead. Do not guess the intent.
- Fix only what the task names. If you notice something else, report it and leave it.
- One task is one commit that passes the checks.

## Stop and ask first

- Adding, removing or upgrading a dependency.
- Adding a page, a route or a database table.
- Editing `next.config.*`, `tailwind.config.*`, `postcss.config.*` or `tsconfig.json`.
- Changing tokens or patterns in `design.md`.
- Deleting or renaming files.
- Touching `app/lab/` or `components/room/`. The hidden studio is frozen.
- Touching `docs/pm/`, `docs/quotation/`, `.githooks/`, `CLAUDE.md` or this file.
- A result that does not match what the task expected.

## Never

- Push to `main`, merge, force push or deploy.
- Use `git commit --no-verify`, or set `ITERRA_ALLOW_PROTECTED`. Only the lead does that.
- Commit secrets or `.env` files.
- Invent content: metrics, testimonials, prices, client names or legal text.
- Write that the project is certified by, or complies with, an ISO standard. See `docs/pm/standards.md`.

## Before writing code

- Read the Next.js guide for the API you are about to use, as the block above says.
- For interface work, read `design.md` and reuse its classes.
- Look for an existing helper or component before writing a new one.

## Text

- Interface text goes in `lib/i18n.ts`, in Thai and in English.
- No U+0E4E in Thai text. No en dash anywhere.
- No arrows and no emoji in interface text.

## Done means

- `npx tsc --noEmit` passes, ignoring `.next/types`.
- `npm run check:text` passes. It scans every tracked source file for U+0E4E and the en dash.
- The `check:*` scripts that apply to the change pass. `npm run check:overflow` needs the dev server on port 4100.
- `npm run build` passes.
- The report says what changed, what was verified and how, and what was not verified.

## Git

- One branch per task, cut from `origin/main` with `--no-track`.
- Conventional Commits: `feat:`, `fix:`, `docs:`, `chore:`.
- Hooks live in `.githooks/` and `npm install` turns them on. They block commits on `main`, secrets, the banned characters and protected files, and they block pushes to `main`.
- Approval in chat does not get a protected file past the hook. A plan must name each task that changes a protected file, and that task ends with the files staged: the lead commits them with the override. An agent never sets the override.
- Join commit and push with `&&`, never `;`. Never push after a commit failed.
- Commit messages and pull request text carry no trace of an AI tool: no `Co-Authored-By` line for a tool, no "Generated with" line, no tool names. `.githooks/commit-msg` blocks them; check PR text with `sh .githooks/commit-msg <file>`.
- To open a pull request, follow `.claude/skills/open-pr/SKILL.md`.

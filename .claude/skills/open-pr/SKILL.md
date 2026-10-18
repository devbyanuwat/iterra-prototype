---
name: open-pr
description: Open a pull request into main for the iterra-prototype repo. Use when asked to "open a PR", "ทำ PR", "ส่งงานเข้า main", or when a task branch is finished and needs review.
---

# Open a pull request (iterra-prototype)

Every person and every agent opens pull requests this way. Rules come from
`AGENTS.md`; if this file and `AGENTS.md` disagree, `AGENTS.md` wins.

## Never

- Push to `main`, merge, force push, enable auto-merge or deploy.
- Open a PR whose base is another task branch. The repo does not delete head
  branches on merge, so a stacked PR can merge into a dead branch and never
  reach `main`. One PR, base `main`.
- Put a tool name, a `Co-Authored-By` line for a tool, or a "Generated with"
  line in the title, the body or any commit.

## 1. Check the branch

```bash
git fetch origin
git branch --show-current          # must not be main
git status --short                 # must be empty
git log --oneline origin/main..HEAD
```

- One task is one commit. Several commits for one task: stop and ask the lead.
- Each commit message must pass the hook:
  `git log --format=%B origin/main..HEAD > /tmp/pr-msgs && sh .githooks/commit-msg /tmp/pr-msgs`

## 2. Bring main in

```bash
git rev-list --count HEAD..origin/main    # 0 means up to date
git merge origin/main                     # only when the count is above 0
```

Merge, do not rebase: a rebase of a pushed branch needs a force push.
Conflicts: resolve, then run step 3 again in full.

## 3. Run the checks

```bash
npx tsc --noEmit
npm run build
```

Also run every `check:*` script in `package.json` that applies to the change.
`npm run check:overflow` needs the dev server on port 4100. Write down what
passed and what you did not run.

## 4. Draft the title and body

Title: Conventional Commit form, under 70 characters, e.g.
`feat: product page with 7 categories`.

Body, saved to a file:

```markdown
## Summary
One or two sentences: what this changes and why.

## Changes
- file or area: what changed

## How it was verified
- command or step: result

## Not verified
- what was not checked, and why

## Screenshots
Only for interface changes. Desktop and 768px width.
```

Check both before showing anyone:

```bash
printf '%s\n' "<title>" | cat - /tmp/pr-body.md > /tmp/pr-all.md
sh .githooks/commit-msg /tmp/pr-all.md
```

## 5. Ask the lead

Show the lead the title, the body and the commit list. Wait for a clear yes.
An earlier "go ahead" for the code does not cover opening the PR.

## 6. Push and open

```bash
git push -u origin "$(git branch --show-current)" && \
gh pr create --base main --head "$(git branch --show-current)" \
  --title "<title>" --body-file /tmp/pr-body.md
```

Report the PR URL. Leave review and merge to the lead.

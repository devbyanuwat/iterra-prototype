# Backend content and security: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the security foundation (audit log, session idle timeout, account disable script, retention prune) and move articles, projects, the catalog PDF, the contact form and a search query log onto PostgreSQL, with admin screens for each.

**Architecture:** Same shape as Plan 1. Data access lives in `lib/server/*.ts`: plain functions that take a `db` argument and import only types and `node:` modules, so `scripts/check-db.mjs` runs them with Node against `iterra_test`. Admin writes go through `adminAction`, which now runs the write and its `audit()` row in one transaction. Public pages read published rows only; the root layout stays `force-dynamic`. The catalog PDF (up to 30 MB) is the one write that uses a Route Handler, because Server Functions cap at 6 MB and `proxy.ts` buffers only 10 MB.

**Tech Stack:** Next.js 16.3.8 (App Router, Server Functions, Route Handlers, `proxy.ts`), React 19, PostgreSQL 16 on port 5433, `pg` 8.23.1, `sharp` 0.35.5, Tailwind 3.4, Node 22 (`--experimental-strip-types` for tests). No new dependency.

**Spec:** `docs/superpowers/specs/2026-10-15-backend-postgres-design.md` (section 11 is new for this plan)

## Decisions

Items 1, 2, 3, 4 and 6 were confirmed by the lead on 2026-10-15. Items 5, 7, 8, 9 and 10 add detail found while writing this plan and wait for the lead to confirm before Task 1 starts.

1. No mockup. The existing admin screens (`ProductsAdmin`, `TaxonomyAdmin`, `AnnouncementAdmin`) are the reference for every new admin screen.
2. Email later. The contact form stores rows only; `emailed_at` stays null; the team reads `/admin/inquiries/`. Per `docs/pm/standards.md` section 3, the privacy policy needs legal review before the form collects real data on production.
3. Search query log for every visitor, no consent gate: rows are anonymous daily aggregates with no IP, session or cookie. A sentence is added to the privacy page.
4. Retention: `login_attempts` 90 days, `sessions` when expired or idle, `audit_log` 365 days, `search_queries` 400 days, `inquiries` never (legal review pending).
5. Catalog PDF: limit 30 MB (spec section 5; covers the 18 MB requirement in `docs/pm/standards.md` ISO 25010 row). Uploaded through a new Route Handler `POST /api/catalog-pdf/` outside the `/admin` proxy matcher, so the protected `next.config.mjs` is **not** changed. The server's nginx needs `client_max_body_size 31m` (deploy note). Page count is read from the PDF without a dependency; when it cannot be read it is stored as 0 and not shown. After a replacement the old page images are hidden and the page opens the PDF directly.
6. Session idle timeout 120 minutes (`SESSION_IDLE_MIN`), `last_seen_at` written at most every 5 minutes; the 14 day absolute expiry stays.
7. The contact field accepts an email **or** a phone number, because the live label is "อีเมลหรือเบอร์โทร". Rate limit is 3 messages per salted IP per 10 minutes (the spec said 5 per hour; updated).
8. New routes: `/admin/articles/`, `/admin/projects/`, `/admin/catalog/`, `/admin/inquiries/`, `/api/catalog-pdf/`. New tables: `audit_log`, `search_queries` (plus column `sessions.last_seen_at`). Protected file touched: `package.json` dependency list, only by the merge of `chore/upgrade-next-sharp` in Task 1.
9. The privacy sentence goes into `components/PrivacyContent.tsx`, because that is where the privacy page text lives today (it is not in `lib/i18n.ts`).
10. Admin edits the Thai article body only, as the public article page renders the Thai body only. Product links on a project follow the product sort order (`project_products` has no position column).

## Global Constraints

- Code folder `/Users/anuwatttttt/Documents/Dev/iterra/iterra-prototype`. Execution branch `feat/backend-content`, cut in Task 1 Step 1 with `git switch -c feat/backend-content --no-track origin/feat/backend-foundation`. Push only with `git push -u origin feat/backend-content` (first time) and `git push` after that. Never push to `main` or `dev`, never merge into them, never force push, never deploy.
- One task is one commit (Task 1 also has the two setup merge commits). Conventional Commits (`feat:`, `fix:`, `chore:`). No AI traces in commit messages: no `Co-Authored-By`, no tool names.
- AGENTS.md: do only what the task says; a result that does not match the expected output means stop and report.
- Protected files: `next.config.*`, `tailwind.config.*`, `postcss.config.*`, `tsconfig.json`, `design.md`, `AGENTS.md`, `CLAUDE.md`, `.githooks/*`, `docs/pm/*`, `docs/quotation/*`, `app/lab/*`, `components/room/*`, and the dependency lists in `package.json`. This plan changes only the `package.json` dependency list, and only through the Task 1 merge. For that commit: first commit without the override and see the hook block it, then commit with `ITERRA_ALLOW_PROTECTED=1`. The lead approved this for the file named here. Never use `--no-verify`.
- No new dependency. Use `pg`, `sharp` and the Node standard library.
- PostgreSQL listens on **port 5433**. The test database name ends in `_test` (`scripts/check-db.mjs` refuses anything else). Never connect to `iaxo_backend_v2`.
- New schema goes in new numbered files read by `scripts/db-migrate.mjs` (sorted by file name, one transaction per file): `002_audit_session_idle.sql` (Task 1), `003_search_queries.sql` (Task 6). Each task that adds a table also adds it to the table list asserted in `scripts/check-db.mjs` and to the `migrate()` result asserted there.
- `lib/server/*.ts` import only `import type ...` and `node:` modules (Node strip-types cannot resolve `@/` or extension-less relative imports). Each file declares its own `Db` type and its own `InputError` class when it throws one.
- Every admin Server Function goes through `adminAction` (or calls `requireAdmin` first, as `uploadImageAction` does) from `lib/admin.ts`, and writes an `audit()` row. The public site never imports admin action files.
- Admin text fields reject `<` and `>` with `InputError('ห้ามใช้เครื่องหมาย < หรือ >')`, as `str()` in `lib/server/products.ts` and `text()` in `lib/server/taxonomy.ts` do, and each new module has a test for it.
- SQL always uses `$n` parameters.
- Admin interface text is Thai only. Public interface text goes in `lib/i18n.ts` in Thai and English (the privacy page keeps its own `COPY` object, see decision 9). No U+0E4E, no en dash, no em dash in new text, no arrows and no emoji in new interface text.
- Admin UI reuses `components/admin/ui.ts` classes, `.glass`, `AdminShell` (menu entries go there), and the `ProductsAdmin` layout rules: cards below `lg`, rows at `lg` and up, dialogs as bottom sheets with `bottom-0 top-auto !m-0 ... md:top-0 md:!m-auto` (a dialog inside `space-y-*` otherwise gets a margin).
- Do not invent content: no prices, metrics, testimonials, client names or legal text.
- Next.js 16 has breaking changes. Docs read for this plan (all under `node_modules/next/dist/docs/01-app/`): `01-getting-started/07-mutating-data.md` (Server Functions), `02-guides/server-actions.md` (section Security: Origin check, 1 MB default body limit, sequential dispatch), `03-api-reference/05-config/01-next-config-js/serverActions.md` (`bodySizeLimit`), `03-api-reference/05-config/01-next-config-js/proxyClientMaxBodySize.md` (proxy buffers 10 MB and silently truncates), `01-getting-started/15-route-handlers.md`, `03-api-reference/04-functions/cookies.md` (readable in Route Handlers), `01-getting-started/16-proxy.md`. Read the one for the API you touch before writing it.
- Gates before every commit:
  - `npx tsc --noEmit 2>&1 | grep -v '\.next/types'` prints nothing
  - `npm run check:db && npm run check:filter && npm run check:search` all print `ผ่าน`
  - `npm run build` succeeds
  - after `git add`: `npm run check:text` prints `ผ่าน` (it scans tracked files, so new files count only once added)
  - for tasks that change public pages: `npm run check:overflow` with the dev server on port 4100. It does not visit admin pages (they need a login inside the script, which it does not have); admin pages are checked in the browser step of each task.
- `scripts/check-artwork.mjs` is stale since Plan 1. Do not run it.

## Review Focus

1. A bot posts the contact form: fills the hidden field, or sends many messages from one address. Expected: hidden field filled = answer looks like success, nothing stored; the 4th message from the same salted IP in 10 minutes = `limit`, nothing stored. Pinned in Task 5 Step 1 (`check:db`) and Task 5 Step 8 (browser, decided from the row count).
2. A visitor types an email address or a phone number into site search. Expected: never stored, in any form. Pinned in Task 6 Step 1 (`normalizeQuery` and `logSearch` tests, plus a column list assert that the table holds no IP, session or cookie).
3. A PDF upload that is an HTML file renamed `.pdf`, a file over 30 MB, or a POST with no session. Expected: rejected, the `catalog` row unchanged. Pinned in Task 4 Step 1 (`isPdf`, `saveCatalog` path checks) and Task 4 Step 9 (browser fake PDF, in-page 31 MB fetch returns 413, curl without cookie returns 401).
4. An admin leaves a tab open for more than 2 hours, then clicks save. Expected: sent to the login page, nothing written. Pinned in Task 1 Step 1 (`sessionUser` idle tests) and Task 1 Step 9 (browser, decided from the database).
5. The catalog PDF is replaced. Expected: the public catalog page and the home teaser no longer show the page images of the old PDF; the page offers the new PDF directly. Pinned in Task 4 Step 1 (`getCatalog().images`) and Task 4 Step 9.

## File map

| File | Task | Responsibility |
|---|---|---|
| `package.json`, `package-lock.json` | 1 | merge `next` 16.3.8 and `check:text`; scripts `db:disable-admin` (1), `db:prune` (7) |
| `db/migrations/002_audit_session_idle.sql` | 1 | `audit_log`, `sessions.last_seen_at` |
| `lib/server/audit.ts` | 1 | `audit()` |
| `lib/server/auth.ts` | 1 | idle check and refresh, login and logout audit, `disableAdmin` |
| `lib/admin.ts` | 1 | `inTx`, `adminAction(fn(tx, admin))`, idle setting |
| `app/admin/(panel)/*/actions.ts`, `upload-action.ts` | 1 | every write audited |
| `lib/server/products.ts` | 1 | `deleteProduct` returns the slug |
| `scripts/db-disable-admin.mjs`, `.env.example` | 1 | disable script, `SESSION_IDLE_MIN` |
| `scripts/check-db.mjs` | 1 to 7 | integration checks |
| `lib/server/posts.ts`, `lib/posts.ts` | 2 | articles data layer, `PostCard` type |
| `app/admin/(panel)/articles/*`, `components/admin/PostsAdmin.tsx`, `components/admin/ImageField.tsx` | 2 | articles admin, `max` on the image field |
| `components/admin/AdminShell.tsx` | 2 to 5 | menu entries, mobile bar shows 4 |
| `app/articles/page.tsx`, `app/articles/[slug]/page.tsx`, `app/sitemap.ts` | 2 | public articles from the database |
| `components/CatalogProvider.tsx`, `app/layout.tsx` | 2, 3 | posts and projects for client components |
| `components/home/HomeContent.tsx` | 2, 4 | latest posts from the provider, catalog prop |
| `components/SearchPanel.tsx` | 2, 3, 6 | index sources from the provider, search log |
| `lib/server/projects.ts`, `app/admin/(panel)/projects/*`, `components/admin/ProjectsAdmin.tsx`, `components/ProjectsContent.tsx` | 3 | projects |
| `lib/server/catalog.ts`, `app/api/catalog-pdf/route.ts`, `app/admin/(panel)/catalog/page.tsx`, `components/admin/CatalogAdmin.tsx` | 4 | catalog PDF |
| `app/catalog/page.tsx`, `app/page.tsx`, `components/CatalogContent.tsx`, `CatalogViewer.tsx`, `CatalogTeaser.tsx`, `lib/i18n.ts` | 4 | public catalog from the database |
| `lib/server/inquiries.ts`, `app/contact/actions.ts`, `components/ContactContent.tsx`, `lib/i18n.ts` | 5 | contact form |
| `app/admin/(panel)/inquiries/*`, `components/admin/InquiriesAdmin.tsx` | 5 | inbox |
| `db/migrations/003_search_queries.sql`, `lib/server/search-log.ts`, `app/search-log-action.ts`, `components/PrivacyContent.tsx` | 6 | search query log |
| `scripts/db-prune.mjs` | 7 | retention prune |

---

## Browser QA procedure (used by every browser step)

Run these from the code folder. `SCRATCH` is your own scratchpad directory (outside the repo). The password is generated into a file readable only by you; never print it in chat, never put it in a commit.

**Q0. Dev server.** If nothing listens on 4100, start it with `preview_start` using config `iterra-dev` (from `.claude/launch.json`). Drive the browser with the chrome-devtools MCP tools (`navigate_page`, `take_snapshot`, `fill`, `click`, `upload_file`, `handle_dialog`, `evaluate_script`, `list_console_messages`).

**Q1. Create the throwaway QA admin and log in.**

```bash
SCRATCH=/path/to/your/scratchpad
( umask 077; openssl rand -base64 18 > "$SCRATCH/qa-admin.pw" )
ls -l "$SCRATCH/qa-admin.pw" | cut -c1-10
ADMIN_EMAIL=qa@iterra.test ADMIN_NAME='QA ชั่วคราว' ADMIN_PASSWORD="$(cat "$SCRATCH/qa-admin.pw")" npm run db:admin
```
Expected: `-rw-------`, then `บันทึกผู้ดูแลระบบ qa@iterra.test แล้ว`. Environment variables win over `.env`, so the dev admin in `.env` is not touched.

In the browser open `http://localhost:4100/admin/login/`, `take_snapshot`, `fill` the email field with `qa@iterra.test`, `fill` the password field with the content of `$SCRATCH/qa-admin.pw` (read it with the Read tool; a scripted form submit does not work here), then `click` the submit button. Decide success from the database:

```bash
psql -h localhost -p 5433 -d iterra_dev -Atc "select count(*) from sessions s join admin_users u on u.id = s.user_id where u.email = 'qa@iterra.test'"
```
Expected: `1` (from Task 1 on, also one `login` row in `audit_log` for this user).

**Q2. Clean up** (after the task's own row cleanup):

```bash
SCRATCH=/path/to/your/scratchpad
UP=$(grep '^UPLOAD_DIR=' .env | cut -d= -f2)
PSQL="psql -h localhost -p 5433 -d iterra_dev -v ON_ERROR_STOP=1 -At"
# ไฟล์ที่ QA อัปโหลด: อ่านจาก audit ก่อนลบ audit
$PSQL -c "select coalesce(a.detail->>'pdf', a.entity_id) from audit_log a join admin_users u on u.id = a.user_id
          where u.email = 'qa@iterra.test' and a.action in ('upload', 'replace')" > "$SCRATCH/qa-files.txt"
while read -r url; do case "$url" in /uploads/*) rm -f -- "$UP/${url#/uploads/}" ;; esac; done < "$SCRATCH/qa-files.txt"
$PSQL <<'SQL'
begin;
delete from audit_log where user_id = (select id from admin_users where email = 'qa@iterra.test');
delete from sessions where user_id = (select id from admin_users where email = 'qa@iterra.test');
delete from admin_users where email = 'qa@iterra.test';
commit;
SQL
rm -f "$SCRATCH/qa-admin.pw" "$SCRATCH/qa-files.txt"
$PSQL -c "select count(*) from admin_users where email = 'qa@iterra.test'"
```
Expected: last line `0`. Before Task 1 is committed the `audit_log` table does not exist on `iterra_dev` until Task 1 Step 8 migrates it; Q2 is only used after that.

---

### Task 1: Branch, audit log, session idle timeout and the disable script

**Files:**
- Merge: `origin/chore/check-text`, `origin/chore/upgrade-next-sharp` (conflicts in `package.json`, `package-lock.json`)
- Create: `db/migrations/002_audit_session_idle.sql`, `lib/server/audit.ts`, `scripts/db-disable-admin.mjs`
- Modify: `lib/server/auth.ts`, `lib/admin.ts`, `lib/server/products.ts` (`deleteProduct`), `app/admin/(panel)/products/actions.ts`, `app/admin/(panel)/categories/actions.ts`, `app/admin/(panel)/announcement/actions.ts`, `app/admin/(panel)/upload-action.ts`, `package.json` (script only), `.env.example`
- Test: `scripts/check-db.mjs`

**Interfaces:**
- Consumes (Plan 1, exists today): `sessionUser(db, token)`, `login(db, email, password, ipHash, days)`, `logout(db, token)`, `upsertAdmin(db, email, name, password)`, `type Admin = { id: number; email: string; name: string }` in `lib/server/auth.ts`; `requireAdmin()`, `currentAdmin()`, `ipHash()`, `adminAction(fn)`, `type Result` in `lib/admin.ts`; `db: Pool` in `lib/db.ts`.
- Produces:
  - `audit(db: Db, userId: number | null, action: string, entity: string, entityId: string | number | null, detail?: Record<string, unknown>): Promise<void>` in `lib/server/audit.ts`
  - `sessionUser(db, token, idleMin = 120): Promise<Admin | null>`; `disableAdmin(db, email): Promise<number | null>` (returns the disabled user id) in `lib/server/auth.ts`
  - `inTx<T>(fn: (tx: PoolClient) => Promise<T>): Promise<T>` and `adminAction(fn: (tx: PoolClient, admin: Admin) => Promise<unknown>): Promise<Result>` in `lib/admin.ts`
  - `deleteProduct(db, id): Promise<string | null>` (slug of the deleted row)
  - audit vocabulary used by every later task: actions `login logout create update delete publish unpublish upload replace handle disable`; entities `admin_user product category brand material announcement file post project catalog inquiry`

- [ ] **Step 1: Cut the branch and merge the two prerequisite branches**

```bash
cd /Users/anuwatttttt/Documents/Dev/iterra/iterra-prototype
git status --short
git fetch origin
git switch -c feat/backend-content --no-track origin/feat/backend-foundation
git merge --no-ff origin/chore/check-text -m "chore: merge the banned character check into the content branch"
git merge --no-ff origin/chore/upgrade-next-sharp
```
Expected: `git status --short` prints nothing before the switch. The first merge succeeds with no conflict. The second stops with `CONFLICT (content): Merge conflict in package-lock.json` and `... in package.json`. Both conflicts are the same hunk: ours has `"next": "^16.3.3"` plus `"pg": "^8.23.1"`, theirs has `"next": "^16.3.8"`. Keep both changes:

```bash
perl -0pi -e 's/<<<<<<< [^\n]*\n(\s*)"next": "\^16\.3\.3",\n\s*"pg": "\^8\.23\.1",\n=======\n\s*"next": "\^16\.3\.8",\n>>>>>>> [^\n]*\n/$1"next": "^16.3.8",\n$1"pg": "^8.23.1",\n/' package.json package-lock.json
grep -c '<<<<<<<\|>>>>>>>\|^=======' package.json package-lock.json
node -e "const l=require('./package-lock.json');const p=require('./package.json');console.log(p.dependencies.next,p.dependencies.pg,l.packages[''].dependencies.next,l.packages['node_modules/next'].version,l.packages['node_modules/sharp'].version)"
npm ci
node -p "require('next/package.json').version + ' ' + require('sharp/package.json').version"
```
Expected: `package.json:0` and `package-lock.json:0`; then `^16.3.8 ^8.23.1 ^16.3.8 16.3.8 0.35.5`; `npm ci` finishes without `ERESOLVE` or "lock file out of sync"; last line `16.3.8 0.35.5`.

```bash
git add package.json package-lock.json
git commit -m "chore: merge the next and sharp security upgrade into the content branch"
```
Expected: the hook blocks it with `protected files are staged:` and `package.json (dependencies changed)`. That block is the check; the lead approved this file for this merge. Then:

```bash
ITERRA_ALLOW_PROTECTED=1 git commit -m "chore: merge the next and sharp security upgrade into the content branch"
git log --oneline -3
ls scripts/check-text.mjs
```
Expected: the commit succeeds; the log shows both merge commits on top of `e6acc42 fix: lock login after 5 failed attempts`; `scripts/check-text.mjs` exists.

- [ ] **Step 2: Prove the merged base passes every gate before changing code**

```bash
npx tsc --noEmit 2>&1 | grep -v '\.next/types'
npm run check:db && npm run check:filter && npm run check:search && npm run check:text
npm run build
```
Expected: tsc prints nothing; the four checks print `ผ่าน`; build succeeds. If anything fails here, stop and report: the base is broken before this plan's code.

- [ ] **Step 3: Write the failing tests**

In `scripts/check-db.mjs`:

Replace
```js
import { migrate } from './db-migrate.mjs';
```
with
```js
import { migrate } from './db-migrate.mjs';
import { audit } from '../lib/server/audit.ts';
```

Replace
```js
import { login, logout, sessionUser, sha256, upsertAdmin, verifyPassword } from '../lib/server/auth.ts';
```
with
```js
import { disableAdmin, login, logout, sessionUser, sha256, upsertAdmin, verifyPassword } from '../lib/server/auth.ts';
```

Replace
```js
  assert.deepEqual(await migrate(c), ['001_init.sql']);
```
with
```js
  assert.deepEqual(await migrate(c), ['001_init.sql', '002_audit_session_idle.sql']);
```

Replace
```js
    'admin_users', 'announcement', 'brands', 'catalog', 'categories', 'inquiries', 'login_attempts',
```
with
```js
    'admin_users', 'announcement', 'audit_log', 'brands', 'catalog', 'categories', 'inquiries', 'login_attempts',
```

Replace
```js
  console.log('ผ่าน: ฐานข้อมูล');
```
with
```js
  // ── audit log, session ไม่ได้ใช้นาน, ปิดบัญชี (แผน 2 Task 1) ──
  {
    const pw2 = 'another long password';
    const uid = (await c.query("select id::int as id from admin_users where email = 'admin@example.test'")).rows[0].id;
    const last = async () =>
      (await c.query('select user_id::int as u, action, entity, entity_id, detail from audit_log order by id desc limit 1')).rows[0];
    // login สำเร็จเขียน audit · login ผิดไม่เขียน (อยู่ใน login_attempts แทน)
    const logins = await count("audit_log where action = 'login'");
    const s = await login(c, 'admin@example.test', pw2, 'ip-g', 14);
    assert.ok('token' in s);
    assert.deepEqual(await last(), { u: uid, action: 'login', entity: 'admin_user', entity_id: String(uid), detail: null });
    assert.deepEqual(await login(c, 'admin@example.test', 'wrong', 'ip-g', 14), { error: 'invalid' });
    assert.equal(await count("audit_log where action = 'login'"), logins + 1);
    // ออกจากระบบเขียน audit · token ที่ไม่มีจริงไม่เขียน
    await logout(c, s.token);
    assert.deepEqual(await last(), { u: uid, action: 'logout', entity: 'admin_user', entity_id: String(uid), detail: null });
    const rows = await count('audit_log');
    await logout(c, 'not-a-token');
    assert.equal(await count('audit_log'), rows);
    // audit() เก็บ id เป็นข้อความ และ detail เป็น jsonb · ผู้ใช้ที่ไม่มีจริงโดน FK
    await audit(c, uid, 'update', 'product', 42, { name: 'ซิงก์' });
    assert.deepEqual(await last(), { u: uid, action: 'update', entity: 'product', entity_id: '42', detail: { name: 'ซิงก์' } });
    await audit(c, null, 'disable', 'admin_user', null);
    assert.deepEqual(await last(), { u: null, action: 'disable', entity: 'admin_user', entity_id: null, detail: null });
    await assert.rejects(audit(c, 999999, 'update', 'product', 1), (e) => e.code === '23503');
    // ลบสินค้าคืน slug ให้ audit · ไม่มีแถวแล้วได้ null
    const brandId = (await tax.listBrands(c))[0].id;
    const tmp = await prod.saveProduct(c, null, {
      slug: 'audit-tmp', category: 'sink', brandId, material: '', series: '', th: 'ชั่วคราว', en: '', descTh: '', descEn: '',
      specs: '', images: [], published: false, featured: false,
    });
    assert.equal(await prod.deleteProduct(c, tmp), 'audit-tmp');
    assert.equal(await prod.deleteProduct(c, tmp), null);

    // session ไม่ได้ใช้เกิน 120 นาที (ค่าเริ่มต้น) ใช้ไม่ได้ แม้ยังไม่ครบ 14 วัน
    const t = (await login(c, 'admin@example.test', pw2, 'ip-h', 14)).token;
    const seen = (mins) =>
      c.query('update sessions set last_seen_at = now() - make_interval(mins => $2) where token_hash = $1', [sha256(t), mins]);
    const fresh = async () =>
      (await c.query("select last_seen_at > now() - interval '1 minute' as f from sessions where token_hash = $1", [sha256(t)])).rows[0].f;
    await seen(121);
    assert.equal(await sessionUser(c, t), null);
    await seen(119);
    assert.equal((await sessionUser(c, t))?.id, uid);
    assert.equal(await fresh(), true, 'ใช้หลังห่างเกิน 5 นาที: เขียนเวลาใช้งานใหม่');
    await seen(3);
    assert.ok(await sessionUser(c, t));
    assert.equal(await fresh(), false, 'ห่างไม่ถึง 5 นาที: ไม่เขียน DB');
    assert.equal(await sessionUser(c, t, 2), null, 'ตั้ง SESSION_IDLE_MIN สั้นลงได้');

    // ปิดบัญชี: ตั้ง disabled_at ลบ session ทั้งหมด เขียน audit (ผู้ทำคือสคริปต์ จึงไม่มี user_id)
    assert.equal(await disableAdmin(c, ' ADMIN@Example.test '), uid);
    assert.equal(await count(`sessions where user_id = ${uid}`), 0);
    assert.ok((await c.query('select disabled_at from admin_users where id = $1', [uid])).rows[0].disabled_at);
    assert.deepEqual(await last(), {
      u: null, action: 'disable', entity: 'admin_user', entity_id: String(uid), detail: { email: 'admin@example.test' },
    });
    assert.equal(await sessionUser(c, t), null);
    assert.equal(await disableAdmin(c, 'admin@example.test'), null, 'ปิดซ้ำ = ไม่พบบัญชีที่ใช้งานอยู่');
    assert.equal(await disableAdmin(c, 'nobody@example.test'), null);
    // เปิดใช้ใหม่ด้วย db:admin (upsertAdmin ล้าง disabled_at) ให้ส่วนถัดไปใช้บัญชีนี้ต่อ
    await upsertAdmin(c, 'admin@example.test', 'ผู้ทดสอบ', pw2);
    assert.ok('token' in (await login(c, 'admin@example.test', pw2, 'ip-i', 14)));
  }
  console.log('ผ่าน: ฐานข้อมูล');
```

- [ ] **Step 4: Run it and watch it fail**

Run: `npm run check:db`
Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `lib/server/audit.ts` (or `does not provide an export named 'disableAdmin'`, whichever Node reports first).

- [ ] **Step 5: Write the migration, `audit()` and the auth changes**

Create `db/migrations/002_audit_session_idle.sql`:

```sql
-- 002: audit log และเวลาใช้งานล่าสุดของ session (แผน 2 Task 1 · spec หัวข้อ 11.1 และ 11.3)
create table audit_log (
  id        bigint generated always as identity primary key,
  at        timestamptz not null default now(),
  user_id   bigint references admin_users,   -- null = สคริปต์บน server · ลบบัญชีที่มีประวัติไม่ได้ ใช้ปิดบัญชีแทน
  action    text not null,
  entity    text not null,
  entity_id text,
  detail    jsonb
);
create index on audit_log (at);

alter table sessions add column last_seen_at timestamptz not null default now();
```

Create `lib/server/audit.ts`:

```ts
// audit log: ใคร ทำอะไร กับอะไร เมื่อไร (docs/pm/standards.md หมวด 3 บันทึกและเฝ้าระวัง · spec หัวข้อ 11.1)
// import ไม่มี เพื่อให้ scripts/check-db.mjs รันไฟล์นี้ด้วย Node ได้ตรง ๆ
// login logout และ db:disable-admin เขียนเองใน lib/server/auth.ts (import ข้ามไฟล์ใน lib/server ไม่ได้)
// detail เก็บแค่สิ่งที่ช่วยอ่านย้อนหลัง เช่นชื่อหรือ slug ห้ามใส่ข้อมูลส่วนบุคคลของคนนอก

type Db = { query(text: string, values?: unknown[]): Promise<{ rows: any[]; rowCount: number | null }> };

export async function audit(
  db: Db,
  userId: number | null,
  action: string,
  entity: string,
  entityId: string | number | null,
  detail?: Record<string, unknown>,
): Promise<void> {
  await db.query('insert into audit_log (user_id, action, entity, entity_id, detail) values ($1, $2, $3, $4, $5::jsonb)', [
    userId,
    action,
    entity,
    entityId === null ? null : String(entityId),
    detail ? JSON.stringify(detail) : null,
  ]);
}
```

In `lib/server/auth.ts`, replace the session insert inside `login()`:
```ts
  await db.query('insert into sessions (token_hash, user_id, expires_at) values ($1, $2, $3)', [sha256(token), u.rows[0].id, expires]);
  return { token, expires };
```
with
```ts
  // สร้าง session กับ audit login ในคำสั่งเดียว
  await db.query(
    `with s as (insert into sessions (token_hash, user_id, expires_at) values ($1, $2, $3) returning user_id)
     insert into audit_log (user_id, action, entity, entity_id) select user_id, 'login', 'admin_user', user_id::text from s`,
    [sha256(token), u.rows[0].id, expires],
  );
  return { token, expires };
```

Replace the whole `sessionUser` and `logout` functions:
```ts
export async function sessionUser(db: Db, token: string | undefined): Promise<Admin | null> {
  if (!token) return null;
  const r = await db.query(
    `select u.id::int as id, u.email, u.name
       from sessions s join admin_users u on u.id = s.user_id
      where s.token_hash = $1 and s.expires_at > now() and u.disabled_at is null`,
    [sha256(token)],
  );
  return r.rows[0] ?? null;
}

export async function logout(db: Db, token: string | undefined): Promise<void> {
  if (token) await db.query('delete from sessions where token_hash = $1', [sha256(token)]);
}
```
with
```ts
// ไม่ได้ใช้เกิน idleMin นาที = ใช้ไม่ได้ (spec หัวข้อ 11.3) · อายุสูงสุดยังเป็น expires_at
// เขียน last_seen_at ไม่เกินทุก 5 นาที ไม่ให้ทุกการกดเขียน DB
export async function sessionUser(db: Db, token: string | undefined, idleMin = 120): Promise<Admin | null> {
  if (!token) return null;
  const hash = sha256(token);
  const r = await db.query(
    `select u.id::int as id, u.email, u.name, s.last_seen_at < now() - interval '5 minutes' as stale
       from sessions s join admin_users u on u.id = s.user_id
      where s.token_hash = $1 and s.expires_at > now() and u.disabled_at is null
        and s.last_seen_at > now() - make_interval(mins => $2)`,
    [hash, idleMin],
  );
  const row = r.rows[0];
  if (!row) return null;
  if (row.stale) await db.query('update sessions set last_seen_at = now() where token_hash = $1', [hash]);
  return { id: row.id, email: row.email, name: row.name };
}

// ลบ session กับเขียน audit logout ในคำสั่งเดียว · token ที่ไม่มีจริงไม่เขียนอะไร
export async function logout(db: Db, token: string | undefined): Promise<void> {
  if (!token) return;
  await db.query(
    `with d as (delete from sessions where token_hash = $1 returning user_id)
     insert into audit_log (user_id, action, entity, entity_id) select user_id, 'logout', 'admin_user', user_id::text from d`,
    [sha256(token)],
  );
}

// ปิดบัญชี (พนักงานลาออก): ตั้ง disabled_at ลบ session ทั้งหมด และเขียน audit ในคำสั่งเดียว
// คืน id ของบัญชีที่ปิด · ไม่พบบัญชีที่ยังใช้งานอยู่ = null · เปิดใหม่ด้วย upsertAdmin (npm run db:admin)
export async function disableAdmin(db: Db, email: string): Promise<number | null> {
  const r = await db.query(
    `with u as (update admin_users set disabled_at = now() where email = $1 and disabled_at is null returning id),
          s as (delete from sessions where user_id in (select id from u)),
          a as (insert into audit_log (action, entity, entity_id, detail)
                select 'disable', 'admin_user', id::text, jsonb_build_object('email', $1::text) from u)
     select id::int as id from u`,
    [email.trim().toLowerCase()],
  );
  return r.rows[0]?.id ?? null;
}
```

In `lib/server/products.ts`, replace
```ts
export async function deleteProduct(db: Db, id: number): Promise<void> {
  if (!Number.isInteger(id)) throw new InputError('ไม่พบสินค้านี้');
  await db.query('delete from products where id = $1', [id]);
}
```
with
```ts
// คืน slug ของแถวที่ลบ ให้ audit อ่านย้อนหลังได้ · ไม่มีแถวแล้ว = null
export async function deleteProduct(db: Db, id: number): Promise<string | null> {
  if (!Number.isInteger(id)) throw new InputError('ไม่พบสินค้านี้');
  const r = await db.query('delete from products where id = $1 returning slug', [id]);
  return r.rows[0]?.slug ?? null;
}
```

- [ ] **Step 6: Run the test and watch it pass**

Run: `npm run check:db`
Expected: `ผ่าน: ฐานข้อมูล`

- [ ] **Step 7: Wire the Next side: `adminAction` with a transaction, audited actions, disable script**

Replace the whole of `lib/admin.ts` with:

```ts
import { cache } from 'react';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import type { PoolClient } from 'pg';
import { db } from './db';
import { SESSION_COOKIE, sessionUser, sha256, type Admin } from './server/auth';

export type Result = { ok: true } | { ok: false; error: string };

// ไม่ได้ใช้กี่นาทีแล้วต้องเข้าสู่ระบบใหม่ (spec หัวข้อ 11.3)
const IDLE_MIN = Math.floor(Number(process.env.SESSION_IDLE_MIN)) || 120;

// ตรวจ session จริงจาก DB ทุกหน้าและทุก Server Function ของหลังบ้าน (proxy.ts แค่ดูว่ามี cookie)
export const currentAdmin = cache(async () => sessionUser(db, (await cookies()).get(SESSION_COOKIE)?.value, IDLE_MIN));

export async function requireAdmin(): Promise<Admin> {
  const admin = await currentAdmin();
  if (!admin) redirect('/admin/login/');
  return admin;
}

// IP มาจาก nginx · ผสม IP_SALT ก่อน hash เพราะ IPv4 มีน้อยพอจะไล่ย้อนกลับได้
// nginx ต้องตั้ง `proxy_set_header X-Real-IP $remote_addr;` และห้ามเปิดพอร์ต Node ตรงสู่ภายนอก ไม่งั้น header นี้ปลอมได้
export async function ipHash(): Promise<string> {
  const h = await headers();
  const ip = h.get('x-real-ip')?.trim() || h.get('x-forwarded-for')?.split(',').at(-1)?.trim() || 'local';
  const salt = process.env.IP_SALT;
  if (!salt && process.env.NODE_ENV === 'production') throw new Error('IP_SALT is not set');
  return sha256(`${salt ?? ''}:${ip}`);
}

// งานแก้ข้อมูลกับ audit อยู่ใน transaction เดียว: แก้สำเร็จต้องมีบันทึก บันทึกไม่ได้ก็ไม่แก้
export async function inTx<T>(fn: (tx: PoolClient) => Promise<T>): Promise<T> {
  const tx = await db.connect();
  try {
    await tx.query('begin');
    const out = await fn(tx);
    await tx.query('commit');
    return out;
  } catch (e) {
    await tx.query('rollback').catch(() => {});
    throw e;
  } finally {
    tx.release();
  }
}

// ทุก Server Function ของหลังบ้านผ่านตัวนี้: ตรวจ session ก่อนเสมอ แล้วส่ง transaction กับผู้ดูแลให้ fn เขียน audit
// error ที่ผู้ใช้แก้เองได้แปลเป็นข้อความ error อื่นโยนต่อ ให้ Next แสดงหน้า error แทนการกลืนเงียบ
export async function adminAction(fn: (tx: PoolClient, admin: Admin) => Promise<unknown>): Promise<Result> {
  const admin = await requireAdmin();
  try {
    await inTx((tx) => fn(tx, admin));
    return { ok: true };
  } catch (e) {
    if (e instanceof Error && e.name === 'InputError') return { ok: false, error: e.message };
    const code = (e as { code?: string }).code;
    if (code === '23503') return { ok: false, error: 'ลบไม่ได้ เพราะยังมีสินค้าใช้อยู่' };
    if (code === '23505') return { ok: false, error: 'มีรายการนี้อยู่แล้ว' };
    throw e;
  }
}
```

Replace the whole of `app/admin/(panel)/products/actions.ts` with:

```ts
'use server';

import { adminAction } from '@/lib/admin';
import { audit } from '@/lib/server/audit';
import { deleteProduct, saveProduct, setPublished, type ProductInput } from '@/lib/server/products';

// ทุกตัวผ่าน adminAction: ตรวจ session แล้วรันการแก้กับ audit ใน transaction เดียว
export async function saveProductAction(id: number | null, input: ProductInput) {
  return adminAction(async (tx, a) => {
    const pid = await saveProduct(tx, id, input);
    await audit(tx, a.id, id === null ? 'create' : 'update', 'product', pid, { name: String(input.th).trim() });
  });
}
export async function deleteProductAction(id: number) {
  return adminAction(async (tx, a) => {
    const slug = await deleteProduct(tx, id);
    if (slug) await audit(tx, a.id, 'delete', 'product', id, { slug });
  });
}
export async function setPublishedAction(id: number, published: boolean) {
  return adminAction(async (tx, a) => {
    await setPublished(tx, id, published);
    await audit(tx, a.id, published === true ? 'publish' : 'unpublish', 'product', id);
  });
}
```

Replace the whole of `app/admin/(panel)/categories/actions.ts` with:

```ts
'use server';

import { adminAction } from '@/lib/admin';
import { audit } from '@/lib/server/audit';
import * as tax from '@/lib/server/taxonomy';

// ทุกตัวผ่าน adminAction: ตรวจ session แล้วรันการแก้กับ audit ใน transaction เดียว
export async function saveCategoryAction(input: tax.CategoryInput, isNew: boolean) {
  return adminAction(async (tx, a) => {
    await tax.saveCategory(tx, input, isNew);
    await audit(tx, a.id, isNew === true ? 'create' : 'update', 'category', String(input.key).trim());
  });
}
export async function deleteCategoryAction(key: string) {
  return adminAction(async (tx, a) => {
    await tax.deleteCategory(tx, key);
    await audit(tx, a.id, 'delete', 'category', String(key));
  });
}
export async function saveBrandAction(id: number | null, name: string) {
  return adminAction(async (tx, a) => {
    await tax.saveBrand(tx, id, name);
    await audit(tx, a.id, id === null ? 'create' : 'update', 'brand', id, { name: String(name).trim() });
  });
}
export async function deleteBrandAction(id: number) {
  return adminAction(async (tx, a) => {
    await tax.deleteBrand(tx, id);
    await audit(tx, a.id, 'delete', 'brand', id);
  });
}
export async function saveMaterialAction(input: tax.MaterialInput, isNew: boolean) {
  return adminAction(async (tx, a) => {
    await tax.saveMaterial(tx, input, isNew);
    await audit(tx, a.id, isNew === true ? 'create' : 'update', 'material', String(input.key).trim());
  });
}
export async function deleteMaterialAction(key: string) {
  return adminAction(async (tx, a) => {
    await tax.deleteMaterial(tx, key);
    await audit(tx, a.id, 'delete', 'material', String(key));
  });
}
```

Replace the whole of `app/admin/(panel)/announcement/actions.ts` with:

```ts
'use server';

import { adminAction } from '@/lib/admin';
import { audit } from '@/lib/server/audit';
import { saveAnnouncement, type AnnouncementInput } from '@/lib/server/announcement';

export async function saveAnnouncementAction(input: AnnouncementInput) {
  return adminAction(async (tx, a) => {
    await saveAnnouncement(tx, input);
    await audit(tx, a.id, 'update', 'announcement', 1, { enabled: input.enabled === true, resetSeen: input.resetSeen === true });
  });
}
```

In `app/admin/(panel)/upload-action.ts`, replace
```ts
import { requireAdmin } from '@/lib/admin';
```
with
```ts
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/admin';
import { audit } from '@/lib/server/audit';
```
replace
```ts
  await requireAdmin();
```
with
```ts
  const admin = await requireAdmin();
```
and replace
```ts
  await writeFile(full, webp);
  return { ok: true, url: `/uploads/${name}` };
```
with
```ts
  await writeFile(full, webp);
  const url = `/uploads/${name}`;
  // ไฟล์ที่อัปโหลดแต่ไม่ได้กดบันทึกฟอร์มก็ยังมีบันทึก ใช้ตามหาไฟล์ค้างได้
  await audit(db, admin.id, 'upload', 'file', url);
  return { ok: true, url };
```

Create `scripts/db-disable-admin.mjs`:

```js
// ปิดบัญชีผู้ดูแลระบบ (พนักงานลาออก): ADMIN_EMAIL=someone@example.com npm run db:disable-admin
// อ่าน ADMIN_EMAIL จาก env แบบเดียวกับ db:admin · ตั้ง disabled_at ลบ session ทั้งหมด และเขียน audit ในคำสั่งเดียว
// .env บนเครื่องพัฒนามี ADMIN_EMAIL ของบัญชีพัฒนา จึงต้องใส่ ADMIN_EMAIL=... นำหน้าคำสั่งทุกครั้ง (env มาก่อนไฟล์ .env)
// เปิดใช้ใหม่: npm run db:admin ด้วยอีเมลเดิมและรหัสใหม่
import pg from 'pg';
import { disableAdmin } from '../lib/server/auth.ts';

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
if (!email) {
  console.error('ต้องตั้ง ADMIN_EMAIL');
  process.exit(1);
}
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
try {
  const id = await disableAdmin(pool, email);
  if (id === null) {
    console.error(`ไม่พบบัญชีที่ใช้งานอยู่: ${email}`);
    process.exitCode = 1;
  } else {
    console.log(`ปิดบัญชี ${email} แล้ว ตัด session ทั้งหมดแล้ว`);
  }
} finally {
  await pool.end();
}
```

In `package.json` `scripts`, replace
```json
    "check:db": "node --no-warnings --experimental-strip-types --env-file-if-exists=.env scripts/check-db.mjs"
```
with
```json
    "check:db": "node --no-warnings --experimental-strip-types --env-file-if-exists=.env scripts/check-db.mjs",
    "db:disable-admin": "node --no-warnings --experimental-strip-types --env-file-if-exists=.env scripts/db-disable-admin.mjs"
```

In `.env.example`, replace
```
SESSION_DAYS=14
```
with
```
SESSION_DAYS=14
# ไม่ได้ใช้งานกี่นาทีแล้วต้องเข้าสู่ระบบใหม่
SESSION_IDLE_MIN=120
```

- [ ] **Step 8: Migrate the dev database and prove every action is audited**

```bash
npm run db:migrate
npx tsc --noEmit 2>&1 | grep -v '\.next/types'
grep -L 'audit(' 'app/admin/(panel)'/*/actions.ts 'app/admin/(panel)/upload-action.ts'
grep -L 'adminAction\|requireAdmin' 'app/admin/(panel)'/*/actions.ts 'app/admin/(panel)/upload-action.ts'
```
Expected: `รันแล้ว: 002_audit_session_idle.sql`; tsc prints nothing; both `grep -L` print nothing.

- [ ] **Step 9: Verify in the browser, deciding from the database**

Run Q0 and Q1. Then, with `PSQL="psql -h localhost -p 5433 -d iterra_dev -At"`:

1. Login wrote audit: `$PSQL -c "select a.action from audit_log a join admin_users u on u.id = a.user_id where u.email = 'qa@iterra.test' order by a.id"` prints `login`.
2. On `/admin/products/` press ซ่อน on the first product, then แสดง on it. The same query now ends with `unpublish`, `publish`; `$PSQL -c "select count(*) from products where not published"` equals what it was before (record it first).
3. On `/admin/announcement/` press บันทึก without changing anything. The query ends with `update`, and `$PSQL -c "select entity, entity_id from audit_log order by id desc limit 1"` prints `announcement|1`.
4. Press ออกจากระบบ (sheet "อื่น ๆ" on small screens). The query ends with `logout`, and the QA session count from Q1 is `0`.
5. Idle: log in again (Q1 browser part). Record `$PSQL -c "select published from products order by id limit 1"`. Run `$PSQL -c "update sessions set last_seen_at = now() - interval '121 minutes' where user_id = (select id from admin_users where email = 'qa@iterra.test')"`. Press ซ่อน on that same first product. The browser must land on `/admin/login/`; the recorded `published` value is unchanged; no new `unpublish` row for the QA user.
6. Disable: log in again. Run `ADMIN_EMAIL=qa@iterra.test npm run db:disable-admin`. Expected `ปิดบัญชี qa@iterra.test แล้ว ตัด session ทั้งหมดแล้ว`. Reload `/admin/products/`: lands on `/admin/login/`. `$PSQL -c "select disabled_at is not null from admin_users where email = 'qa@iterra.test'"` prints `t`; the QA session count is `0`; `$PSQL -c "select action, user_id is null, detail->>'email' from audit_log order by id desc limit 1"` prints `disable|t|qa@iterra.test`.
7. Run it again: `ADMIN_EMAIL=qa@iterra.test npm run db:disable-admin` prints `ไม่พบบัญชีที่ใช้งานอยู่: qa@iterra.test` and exits 1.
8. `list_console_messages` (errors only) prints nothing on the admin pages.

Clean up: the `disable` row has `user_id` null, so Q2 does not catch it. Remove it first, then run Q2:
```bash
psql -h localhost -p 5433 -d iterra_dev -v ON_ERROR_STOP=1 -Atc "delete from audit_log where action = 'disable' and detail->>'email' = 'qa@iterra.test'"
```

- [ ] **Step 10: Gates, commit and push**

```bash
npx tsc --noEmit 2>&1 | grep -v '\.next/types'
npm run check:db && npm run check:filter && npm run check:search
npm run build
git add db/migrations/002_audit_session_idle.sql lib/server/audit.ts lib/server/auth.ts lib/server/products.ts lib/admin.ts 'app/admin/(panel)' scripts/db-disable-admin.mjs scripts/check-db.mjs package.json .env.example
npm run check:text
git commit -m "feat: add audit log, session idle timeout and an account disable script" && git push -u origin feat/backend-content
```
Expected: gates as in Global Constraints; the push creates `origin/feat/backend-content` and sets it as upstream.

---

### Task 2: Articles on the database, with their admin screen

**Files:**
- Create: `lib/server/posts.ts`, `app/admin/(panel)/articles/page.tsx`, `app/admin/(panel)/articles/actions.ts`, `components/admin/PostsAdmin.tsx`
- Modify: `lib/posts.ts` (types only), `components/admin/ImageField.tsx`, `components/admin/AdminShell.tsx`, `app/articles/page.tsx`, `app/articles/[slug]/page.tsx`, `app/sitemap.ts`, `components/CatalogProvider.tsx`, `app/layout.tsx`, `components/home/HomeContent.tsx`, `components/SearchPanel.tsx`
- Test: `scripts/check-db.mjs`

**Interfaces:**
- Consumes: `adminAction(fn(tx, admin))`, `audit(...)` (Task 1); `type Post` from `lib/posts.ts` (`{ slug; title: {th,en}; excerpt: {th,en}; date: string; cover: string; inline; tag: string; body: string[] }`).
- Produces:
  - `type PostCard = Omit<Post, 'body' | 'inline'>` in `lib/posts.ts`; `Post.inline` becomes `string[]`
  - in `lib/server/posts.ts`: `type AdminPost`, `type PostInput`, `paragraphs(body): string[]`, `listAdminPosts(db): Promise<AdminPost[]>`, `savePost(db, id: number | null, input: PostInput): Promise<number>`, `setPostPublished(db, id, published): Promise<void>`, `deletePost(db, id): Promise<string | null>`, `listPublishedPosts(db): Promise<PostCard[]>`, `getPublishedPost(db, slug): Promise<Post | null>`
  - `useCatalog().posts: PostCard[]` (Task 3 adds `projects`)
  - `ImageField` prop `max?: number`
  - `AdminShell` `MENU` items `{ href, label, icon, bar? }`; icons `doc`, `house`, `book`, `mail` exist for Tasks 3 to 5

- [ ] **Step 1: Write the failing test**

In `scripts/check-db.mjs`, replace
```js
import { migrate } from './db-migrate.mjs';
```
with
```js
import { migrate } from './db-migrate.mjs';
import * as post from '../lib/server/posts.ts';
```

Replace
```js
  console.log('ผ่าน: ฐานข้อมูล');
```
with
```js
  // ── บทความ (แผน 2 Task 2) ──
  {
    // หน้าเว็บ: ตรงกับข้อมูลเดิมทุกช่อง เรียงวันที่ใหม่ก่อน (หน้าบทความจึงแสดงเหมือนเดิม)
    const cards = await post.listPublishedPosts(c);
    assert.deepEqual(cards.map((p) => p.slug), posts.map((p) => p.slug));
    for (const seedP of posts) {
      const { body: _b, inline: _i, ...card } = seedP;
      assert.deepEqual(cards.find((p) => p.slug === seedP.slug), card, `การ์ดบทความ ${seedP.slug}`);
      assert.deepEqual(await post.getPublishedPost(c, seedP.slug), { ...seedP }, `บทความ ${seedP.slug} จาก DB ต้องตรงกับข้อมูลเดิม`);
    }
    assert.equal(await post.getPublishedPost(c, 'no-such-post'), null);
    assert.deepEqual(post.paragraphs('ก\n\nข\n \n\nค\n'), ['ก', 'ข', 'ค']);

    // หลังบ้าน: ร่างไม่ขึ้นหน้าเว็บ และเปิดจากลิงก์ตรงไม่ได้
    assert.equal((await post.listAdminPosts(c)).length, posts.length);
    const draft = {
      slug: '', titleTh: 'ทดสอบบทความ', titleEn: 'Test Post One', excerptTh: 'สั้น ๆ', excerptEn: '', tagTh: 'ทดสอบ',
      bodyTh: 'ย่อหน้าแรก\n\nย่อหน้าสอง\n\n\nย่อหน้าสาม', cover: '/uploads/2026/10/a.webp', inline: [], published: false,
    };
    const pid = await post.savePost(c, null, draft);
    const row = (await post.listAdminPosts(c)).find((p) => p.id === pid);
    assert.equal(row.slug, 'test-post-one', 'slug ว่าง = สร้างจากหัวข้ออังกฤษ');
    assert.equal(row.date, '', 'ไม่ติ๊กเผยแพร่ = ร่าง');
    assert.equal(row.published, false);
    assert.equal(await post.getPublishedPost(c, 'test-post-one'), null);
    assert.ok(!(await post.listPublishedPosts(c)).some((p) => p.slug === 'test-post-one'));
    // เผยแพร่: วันที่วันนี้ตามเวลาไทย ขึ้นเป็นบทความล่าสุด
    await post.setPostPublished(c, pid, true);
    const today = (await c.query("select to_char((now() at time zone 'Asia/Bangkok')::date, 'YYYY-MM-DD') as d")).rows[0].d;
    const shown = await post.getPublishedPost(c, 'test-post-one');
    assert.equal(shown.date, today);
    assert.deepEqual(shown.body, ['ย่อหน้าแรก', 'ย่อหน้าสอง', 'ย่อหน้าสาม']);
    assert.deepEqual(shown.excerpt, { th: 'สั้น ๆ', en: 'สั้น ๆ' }, 'ไม่กรอกอังกฤษ = ใช้ไทย');
    assert.deepEqual(shown.title, { th: 'ทดสอบบทความ', en: 'Test Post One' });
    assert.equal((await post.listPublishedPosts(c))[0].slug, 'test-post-one');
    // แก้แล้ววันเผยแพร่เดิมไม่เปลี่ยน · ซ่อนแล้วหายจากหน้าเว็บ
    await c.query("update posts set published_at = '2026-01-02' where id = $1", [pid]);
    await post.savePost(c, pid, { ...draft, slug: 'test-post-one', titleTh: 'ทดสอบ 2', inline: ['/media/scenes/a.webp'], published: true });
    assert.equal((await post.getPublishedPost(c, 'test-post-one')).date, '2026-01-02');
    assert.deepEqual((await post.getPublishedPost(c, 'test-post-one')).inline, ['/media/scenes/a.webp']);
    await post.setPostPublished(c, pid, false);
    assert.equal(await post.getPublishedPost(c, 'test-post-one'), null);
    // ข้อมูลผิด
    await assert.rejects(post.savePost(c, null, { ...draft, titleTh: ' ' }), /หัวข้อ/);
    await assert.rejects(post.savePost(c, null, { ...draft, bodyTh: '' }), /เนื้อหา/);
    await assert.rejects(post.savePost(c, null, { ...draft, cover: '' }), /รูปปก/);
    await assert.rejects(post.savePost(c, null, { ...draft, cover: 'https://evil.example/x.webp' }), /ที่อยู่รูป/);
    await assert.rejects(post.savePost(c, null, { ...draft, inline: ['/media/a.webp', '/media/b.webp', '/media/c.webp'] }), /ไม่เกิน 2 รูป/);
    await assert.rejects(post.savePost(c, null, { ...draft, inline: ['/uploads/../../etc/passwd'] }), /ที่อยู่รูป/);
    await assert.rejects(post.savePost(c, null, { ...draft, slug: 'Bad Slug' }), { name: 'InputError' });
    await assert.rejects(post.savePost(c, null, { ...draft, bodyTh: 'ดู <script>x()</script>' }), /< หรือ >/);
    await assert.rejects(post.savePost(c, null, { ...draft, titleEn: 'A > B' }), /< หรือ >/);
    await assert.rejects(post.savePost(c, null, { ...draft, tagTh: 'a<b' }), /< หรือ >/);
    await assert.rejects(post.savePost(c, null, { ...draft, slug: 'test-post-one' }), (e) => e.code === '23505');
    // แท็บอื่นลบไปแล้ว: แก้ไม่ได้ และไม่สร้างใหม่
    assert.equal(await post.deletePost(c, pid), 'test-post-one');
    assert.equal(await post.deletePost(c, pid), null);
    await assert.rejects(post.savePost(c, pid, draft), /ไม่พบบทความนี้/);
    await assert.rejects(post.setPostPublished(c, pid, true), /ไม่พบบทความนี้/);
    assert.equal((await post.listAdminPosts(c)).length, posts.length);
  }
  console.log('ผ่าน: ฐานข้อมูล');
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm run check:db`
Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `lib/server/posts.ts`.

- [ ] **Step 3: Write the data module**

In `lib/posts.ts`, replace
```ts
// ── MOCK DATA ──
// จุดเปลี่ยนเป็นของจริง #2: แทนที่บทความ mock ในไฟล์นี้ด้วยบทความจริง
// (หรือ map จาก CMS — โครงสร้าง type ตรงไปตรงมา)
```
with
```ts
// ── ข้อมูลตัวอย่าง ── ใช้ seed DB (db/seed.mjs) และ scripts/check-search.mjs เท่านั้น
// หน้าเว็บอ่านบทความจาก DB แล้ว (lib/server/posts.ts) แก้บทความที่ /admin/articles/
```
and replace
```ts
  inline: [string, string]; // ภาพประกอบหลังย่อหน้าที่ 2 และ 4
  tag: string;
  body: string[]; // ย่อหน้าภาษาไทย
};
```
with
```ts
  inline: string[]; // ภาพประกอบหลังย่อหน้าที่ 2 และ 4 ไม่เกิน 2 รูป
  tag: string;
  body: string[]; // ย่อหน้าภาษาไทย
};
// การ์ดบทความ: หน้าแรกและการค้นหาใช้ ไม่ต้องส่งเนื้อหาเต็มไปทุกหน้า
export type PostCard = Omit<Post, 'body' | 'inline'>;
```

Create `lib/server/posts.ts`:

```ts
// บทความ: เขียนจากหลังบ้าน และอ่านให้หน้าเว็บ (เฉพาะที่มี published_at)
// import แค่ type เพื่อให้ scripts/check-db.mjs รันไฟล์นี้ด้วย Node ได้ตรง ๆ
// หน้าเว็บแสดงเนื้อหาและหมวดเป็นภาษาไทย (เหมือนก่อนย้ายมา DB) หลังบ้านจึงแก้ body_th กับ tag_th อย่างเดียว body_en tag_en ไม่แตะ
import type { Post, PostCard } from '../posts';

type Db = { query(text: string, values?: unknown[]): Promise<{ rows: any[]; rowCount: number | null }> };

export class InputError extends Error {
  name = 'InputError';
}

export type AdminPost = {
  id: number;
  slug: string;
  titleTh: string;
  titleEn: string;
  excerptTh: string;
  excerptEn: string;
  tagTh: string;
  bodyTh: string; // ย่อหน้าคั่นด้วยบรรทัดว่าง
  cover: string;
  inline: string[]; // ไม่เกิน 2 รูป แทรกหลังย่อหน้าที่ 2 และ 4
  published: boolean;
  date: string; // วันเผยแพร่ YYYY-MM-DD · '' = ร่าง
  updated: string; // YYYY-MM-DD เวลาไทย
};
export type PostInput = Omit<AdminPost, 'id' | 'date' | 'updated'>;

const GONE = 'ไม่พบบทความนี้ อาจถูกลบไปแล้ว';
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
// รูปต้องเป็นไฟล์ในเว็บเอง: ของเดิมใน public/media หรือที่อัปโหลดใน /uploads
const okImage = (s: unknown) => typeof s === 'string' && /^\/(media|uploads)\/[\w./-]+$/.test(s) && !s.includes('..');
// < และ > ไม่มีเหตุให้ใช้ในข้อความหลังบ้าน ปฏิเสธไว้ก่อน เผื่อวันหน้ามีที่ไหนเผลอแสดงเป็น HTML
function text(v: unknown, max: number, required = ''): string {
  const s = typeof v === 'string' ? v.trim() : '';
  if (required && !s) throw new InputError(required);
  if (/[<>]/.test(s)) throw new InputError('ห้ามใช้เครื่องหมาย < หรือ >');
  if (s.length > max) throw new InputError(`ยาวเกิน ${max} ตัวอักษร`);
  return s;
}
const slugFrom = (en: string) => en.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 80).replace(/^-+|-+$/g, '');
// วันนี้ตามเวลาไทย ไม่ขึ้นกับ timezone ของ DB
const TODAY = "(now() at time zone 'Asia/Bangkok')::date";
const SELECT = `select p.*, p.id::int as pid, to_char(p.published_at, 'YYYY-MM-DD') as day,
                       to_char(p.updated_at at time zone 'Asia/Bangkok', 'YYYY-MM-DD') as updated_day
                  from posts p`;

// ย่อหน้าคั่นด้วยบรรทัดว่าง (spec หัวข้อ 3)
export const paragraphs = (body: string) =>
  body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

export async function listAdminPosts(db: Db): Promise<AdminPost[]> {
  const r = await db.query(`${SELECT} order by p.updated_at desc, p.id desc`);
  return r.rows.map((x) => ({
    id: x.pid,
    slug: x.slug,
    titleTh: x.title_th,
    titleEn: x.title_en,
    excerptTh: x.excerpt_th,
    excerptEn: x.excerpt_en,
    tagTh: x.tag_th,
    bodyTh: x.body_th,
    cover: x.cover ?? '',
    inline: x.inline,
    published: x.day !== null,
    date: x.day ?? '',
    updated: x.updated_day,
  }));
}

// คืน id · เผยแพร่ครั้งแรกได้วันที่วันนี้ แก้ทีหลังวันที่เดิมไม่เปลี่ยน · ไม่ติ๊กเผยแพร่ = ร่าง (published_at null)
export async function savePost(db: Db, id: number | null, input: PostInput): Promise<number> {
  if (id !== null && !Number.isInteger(id)) throw new InputError(GONE);
  const titleTh = text(input.titleTh, 200, 'กรุณากรอกหัวข้อภาษาไทย');
  const titleEn = text(input.titleEn, 200);
  const bodyTh = text(input.bodyTh, 20000, 'กรุณากรอกเนื้อหา');
  const slug = text(input.slug, 80) || slugFrom(titleEn) || `post-${Date.now().toString(36)}`;
  if (!SLUG.test(slug)) throw new InputError('slug ใช้ a-z ตัวเลข และ - เท่านั้น');
  const cover = text(input.cover, 300);
  if (!cover) throw new InputError('กรุณาใส่รูปปก');
  const inline = Array.isArray(input.inline) ? input.inline : [];
  if (inline.length > 2) throw new InputError('รูปประกอบได้ไม่เกิน 2 รูป');
  if (![cover, ...inline].every(okImage)) throw new InputError('ที่อยู่รูปไม่ถูกต้อง');
  const excerptTh = text(input.excerptTh, 400);
  const v = [
    slug, titleTh, titleEn || titleTh, excerptTh, text(input.excerptEn, 400) || excerptTh, bodyTh, text(input.tagTh, 60),
    cover, inline, input.published === true,
  ];
  if (id === null) {
    const r = await db.query(
      `insert into posts (slug, title_th, title_en, excerpt_th, excerpt_en, body_th, tag_th, cover, inline, published_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, case when $10::boolean then ${TODAY} end)
       returning id::int as id`,
      v,
    );
    return r.rows[0].id;
  }
  const r = await db.query(
    `update posts set slug = $1, title_th = $2, title_en = $3, excerpt_th = $4, excerpt_en = $5, body_th = $6, tag_th = $7,
       cover = $8, inline = $9, published_at = case when $10::boolean then coalesce(published_at, ${TODAY}) end, updated_at = now()
     where id = $11`,
    [...v, id],
  );
  if (r.rowCount === 0) throw new InputError(GONE);
  return id;
}

export async function setPostPublished(db: Db, id: number, published: boolean): Promise<void> {
  if (!Number.isInteger(id)) throw new InputError(GONE);
  const r = await db.query(
    `update posts set published_at = case when $2::boolean then coalesce(published_at, ${TODAY}) end, updated_at = now() where id = $1`,
    [id, published === true],
  );
  if (r.rowCount === 0) throw new InputError(GONE);
}

// คืน slug ของแถวที่ลบ ให้ audit อ่านย้อนหลังได้ · ไม่มีแถวแล้ว = null
export async function deletePost(db: Db, id: number): Promise<string | null> {
  if (!Number.isInteger(id)) throw new InputError(GONE);
  const r = await db.query('delete from posts where id = $1 returning slug', [id]);
  return r.rows[0]?.slug ?? null;
}

// ── อ่านให้หน้าเว็บ · เฉพาะที่เผยแพร่ ──
function toCard(x: any): PostCard {
  return {
    slug: x.slug,
    title: { th: x.title_th, en: x.title_en },
    excerpt: { th: x.excerpt_th, en: x.excerpt_en },
    date: x.day,
    cover: x.cover ?? '',
    tag: x.tag_th,
  };
}

export async function listPublishedPosts(db: Db): Promise<PostCard[]> {
  const r = await db.query(`${SELECT} where p.published_at is not null order by p.published_at desc, p.id desc`);
  return r.rows.map(toCard);
}

export async function getPublishedPost(db: Db, slug: string): Promise<Post | null> {
  const r = await db.query(`${SELECT} where p.published_at is not null and p.slug = $1`, [slug]);
  const x = r.rows[0];
  return x ? { ...toCard(x), inline: x.inline, body: paragraphs(x.body_th) } : null;
}
```

- [ ] **Step 4: Run the test and watch it pass**

Run: `npm run check:db`
Expected: `ผ่าน: ฐานข้อมูล`

- [ ] **Step 5: Public pages, provider, search and sitemap read the database**

Replace the whole of `components/CatalogProvider.tsx` with:

```tsx
'use client';

// ข้อมูลจาก DB ที่ component ฝั่ง client ใช้หลายหน้า: สินค้าที่เผยแพร่ หมวด วัสดุ และการ์ดบทความ (หน้าแรกกับการค้นหา)
// root layout โหลดครั้งเดียวต่อ request แล้วส่งให้ component ฝั่ง client
// ponytail: ส่งสินค้าทั้งชุดไปทุกหน้า (เท่ากับที่ bundle เดิมฝัง lib/products.ts ไว้) ถ้าสินค้าเกินหลักร้อยให้ย้ายการค้นหาไปฝั่ง server
import { createContext, useContext } from 'react';
import type { Product } from '@/lib/product-filters';
import type { PostCard } from '@/lib/posts';
import type { Lang } from '@/lib/i18n';

type Name = { th: string; en: string };
export type Cat = { key: string; name: Name; multiBrand: boolean };
export type Mat = { key: string; name: Name };
type Catalog = { products: Product[]; categories: Cat[]; materials: Mat[]; posts: PostCard[] };

const Ctx = createContext<Catalog>({ products: [], categories: [], materials: [], posts: [] });

export function CatalogProvider({ value, children }: { value: Catalog; children: React.ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCatalog() {
  const c = useContext(Ctx);
  return {
    ...c,
    catName: (key: string, lang: Lang) => c.categories.find((x) => x.key === key)?.name[lang] ?? key,
    matName: (key: string, lang: Lang) => c.materials.find((x) => x.key === key)?.name[lang] ?? key,
  };
}
```

In `app/layout.tsx`, replace
```tsx
import { listCategories, listMaterials } from '@/lib/server/taxonomy';
```
with
```tsx
import { listCategories, listMaterials } from '@/lib/server/taxonomy';
import { listPublishedPosts } from '@/lib/server/posts';
```
replace
```tsx
  const [products, categories, materials, announcement] = await Promise.all([
    listPublished(db),
    listCategories(db),
    listMaterials(db),
    getAnnouncement(db),
  ]);
```
with
```tsx
  const [products, categories, materials, announcement, posts] = await Promise.all([
    listPublished(db),
    listCategories(db),
    listMaterials(db),
    getAnnouncement(db),
    listPublishedPosts(db),
  ]);
```
and replace
```tsx
          <CatalogProvider value={{ products, categories, materials }}>
```
with
```tsx
          <CatalogProvider value={{ products, categories, materials, posts }}>
```

In `components/home/HomeContent.tsx`, delete the line
```tsx
import { posts } from '@/lib/posts';
```
and replace
```tsx
  const { lang, t } = useLang();
  const latest = posts.slice(0, 3);
```
with
```tsx
  const { lang, t } = useLang();
  const latest = useCatalog().posts.slice(0, 3);
```

In `components/SearchPanel.tsx`, replace
```tsx
import { useCatalog } from './CatalogProvider';
import { posts } from '@/lib/posts';
import { projects } from '@/lib/projects';
```
with
```tsx
import { useCatalog } from './CatalogProvider';
import { projects } from '@/lib/projects';
```
and replace
```tsx
  const { products } = useCatalog();
  const index = useMemo(() => buildIndex({ products, posts, projects, pages: PAGES }), [products]);
```
with
```tsx
  const { products, posts } = useCatalog();
  const index = useMemo(() => buildIndex({ products, posts, projects, pages: PAGES }), [products, posts]);
```

In `app/articles/page.tsx`, replace
```tsx
import { posts } from '@/lib/posts';
```
with
```tsx
import { db } from '@/lib/db';
import { listPublishedPosts } from '@/lib/server/posts';
```
and replace
```tsx
export default function ArticlesPage() {
  return (
```
with
```tsx
export default async function ArticlesPage() {
  const posts = await listPublishedPosts(db);
  return (
```
(the markup stays exactly as it is.)

In `app/articles/[slug]/page.tsx`, replace
```tsx
import { notFound } from 'next/navigation';
import JsonLd from '@/components/JsonLd';
import Reveal from '@/components/Reveal';
import ParallaxImage from '@/components/ParallaxImage';
import { getPost, posts } from '@/lib/posts';
import { SITE_NAME, SITE_URL } from '@/lib/site';

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
```
with
```tsx
import { notFound } from 'next/navigation';
import { cache } from 'react';
import JsonLd from '@/components/JsonLd';
import Reveal from '@/components/Reveal';
import ParallaxImage from '@/components/ParallaxImage';
import { db } from '@/lib/db';
import { getPublishedPost } from '@/lib/server/posts';
import { SITE_NAME, SITE_URL } from '@/lib/site';

type Props = { params: Promise<{ slug: string }> };

// metadata กับหน้าใช้ query เดียวกันใน request เดียว · เฉพาะที่เผยแพร่ ร่างจึงได้หน้า 404
const getPost = cache((slug: string) => getPublishedPost(db, slug));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
```
and replace
```tsx
export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const post = getPost(slug);
```
with
```tsx
export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const post = await getPost(slug);
```

Replace the whole of `app/sitemap.ts` with:

```ts
import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';
import { db } from '@/lib/db';
import { listPublished } from '@/lib/server/products';
import { listPublishedPosts } from '@/lib/server/posts';

// สินค้าและบทความมาจาก DB จึงสร้างตอน request (เดิม force-static ตอน build)
export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, posts] = await Promise.all([listPublished(db), listPublishedPosts(db)]);
  const now = new Date();
  const staticPages = ['', '/about/', '/products/', '/catalog/', '/articles/', '/projects/', '/contact/', '/privacy/'].map((p) => ({
    url: `${SITE_URL}${p}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: p === '' ? 1 : 0.7,
  }));

  const productPages = products.map((p) => ({
    url: `${SITE_URL}/products/${p.slug}/`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }));

  const postPages = posts.map((p) => ({
    url: `${SITE_URL}/articles/${p.slug}/`,
    lastModified: new Date(p.date),
    changeFrequency: 'yearly' as const,
    priority: 0.6,
  }));

  return [...staticPages, ...productPages, ...postPages];
}
```

- [ ] **Step 6: Admin actions, page, image field limit and menu**

Create `app/admin/(panel)/articles/actions.ts`:

```ts
'use server';

import { adminAction } from '@/lib/admin';
import { audit } from '@/lib/server/audit';
import { deletePost, savePost, setPostPublished, type PostInput } from '@/lib/server/posts';

// ทุกตัวผ่าน adminAction: ตรวจ session แล้วรันการแก้กับ audit ใน transaction เดียว
export async function savePostAction(id: number | null, input: PostInput) {
  return adminAction(async (tx, a) => {
    const pid = await savePost(tx, id, input);
    await audit(tx, a.id, id === null ? 'create' : 'update', 'post', pid, { title: String(input.titleTh).trim() });
  });
}
export async function deletePostAction(id: number) {
  return adminAction(async (tx, a) => {
    const slug = await deletePost(tx, id);
    if (slug) await audit(tx, a.id, 'delete', 'post', id, { slug });
  });
}
export async function setPostPublishedAction(id: number, published: boolean) {
  return adminAction(async (tx, a) => {
    await setPostPublished(tx, id, published);
    await audit(tx, a.id, published === true ? 'publish' : 'unpublish', 'post', id);
  });
}
```

Create `app/admin/(panel)/articles/page.tsx`:

```tsx
import type { Metadata } from 'next';
import PostsAdmin from '@/components/admin/PostsAdmin';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/admin';
import { listAdminPosts } from '@/lib/server/posts';

export const metadata: Metadata = { title: 'บทความ' };

export default async function AdminArticlesPage() {
  await requireAdmin();
  return <PostsAdmin posts={await listAdminPosts(db)} />;
}
```

In `components/admin/ImageField.tsx`, replace
```tsx
  multiple = true,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  multiple?: boolean;
}) {
```
with
```tsx
  multiple = true,
  max = Infinity,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  multiple?: boolean;
  max?: number; // จำนวนรูปสูงสุดเมื่อ multiple · ครบแล้วซ่อนช่องอัปโหลด
}) {
```
and replace
```tsx
      {(multiple || value.length === 0) && (
```
with
```tsx
      {(multiple ? value.length < max : value.length === 0) && (
```

In `components/admin/AdminShell.tsx`:

Replace
```tsx
const MENU = [
  { href: '/admin/products/', label: 'สินค้า', icon: 'box' },
  { href: '/admin/categories/', label: 'หมวด แบรนด์ วัสดุ', icon: 'tag' },
  { href: '/admin/announcement/', label: 'ประกาศ', icon: 'megaphone' },
] as const;
// ทำในแผนที่ 2
const LATER = ['บทความ', 'ผลงาน', 'แคตตาล็อก'];
const MORE_LABEL = 'อื่น ๆ: ความทึบกระจก เปิดหน้าเว็บ ออกจากระบบ';
```
with
```tsx
// bar = อยู่บนแถบลอยของมือถือ (ไม่เกิน 4 อัน ปุ่มละกว้างพอแตะบนจอ 375) ที่เหลืออยู่ใน sheet อื่น ๆ · rail ของ iPad และ sidebar แสดงครบ
type MenuItem = { href: string; label: string; icon: keyof typeof ICON_PATHS; bar?: boolean };
const MENU: MenuItem[] = [
  { href: '/admin/products/', label: 'สินค้า', icon: 'box', bar: true },
  { href: '/admin/articles/', label: 'บทความ', icon: 'doc', bar: true },
  { href: '/admin/categories/', label: 'หมวด แบรนด์ วัสดุ', icon: 'tag' },
  { href: '/admin/announcement/', label: 'ประกาศ', icon: 'megaphone' },
];
const MORE_LABEL = 'อื่น ๆ: เมนูที่เหลือ ความทึบกระจก เปิดหน้าเว็บ ออกจากระบบ';
```

Replace
```tsx
  person: (
```
with
```tsx
  doc: (
    <>
      <path d="M6.5 3.5h8l3.5 3.5v13.5h-11.5z" />
      <path d="M14.5 3.5V7H18M9 11.5h6M9 15h6" />
    </>
  ),
  house: (
    <>
      <path d="M4 20.5h16M6 20.5V9.5L12 4.5l6 5v11" />
      <path d="M10 20.5v-5h4v5" />
    </>
  ),
  book: (
    <>
      <path d="M4 5.5c2.7-1.3 5.3-1.3 8 0v14c-2.7-1.3-5.3-1.3-8 0z" />
      <path d="M12 5.5c2.7-1.3 5.3-1.3 8 0v14c-2.7-1.3-5.3-1.3-8 0z" />
    </>
  ),
  mail: (
    <>
      <rect x="3.5" y="5.5" width="17" height="13" rx="1.5" />
      <path d="m4 6.5 8 6.5 8-6.5" />
    </>
  ),
  person: (
```

Replace
```tsx
  const later = LATER.map((x) => (
    <li key={x}>
      <span className="flex min-h-11 items-center whitespace-nowrap rounded-full px-4 text-sm text-stone-600">{x}</span>
    </li>
  ));
```
with
```tsx
  // เมนูที่ไม่อยู่บนแถบลอยของมือถือ แสดงใน sheet อื่น ๆ · ตั้งแต่ md มี rail ครบทุกเมนูแล้ว จึงซ่อน
  const sheetLinks = MENU.filter((m) => !m.bar).map((m) => (
    <li key={m.href}>
      <Link
        href={m.href}
        aria-current={path.startsWith(m.href) ? 'page' : undefined}
        className={`${ghost} w-full justify-center bg-white/60 text-center`}
      >
        {m.label}
      </Link>
    </li>
  ));
```

Replace
```tsx
              })}
              {later}
            </ul>
```
with
```tsx
              })}
            </ul>
```

Replace
```tsx
          {MENU.map((m) => {
            const on = path.startsWith(m.href);
            return (
              <li key={m.href} className="flex-1">
```
with
```tsx
          {MENU.filter((m) => m.bar).map((m) => {
            const on = path.startsWith(m.href);
            return (
              <li key={m.href} className="flex-1">
```

Replace
```tsx
          <div>
            <p className="mb-2 text-sm">เมนูที่จะมาในแผนที่ 2</p>
            <ul className="flex flex-wrap gap-1">{later}</ul>
          </div>
```
with
```tsx
          <nav aria-label="เมนูอื่น" className="md:hidden">
            <ul className="grid grid-cols-2 gap-2">{sheetLinks}</ul>
          </nav>
```

- [ ] **Step 7: Write the admin screen**

Create `components/admin/PostsAdmin.tsx`:

```tsx
'use client';

// หลังบ้าน: บทความ · ข้อมูลจาก DB ทาง props · แก้ผ่าน Server Functions แล้ว router.refresh() ดึงรายการใหม่
// หน้าเว็บแสดงเนื้อหาและหมวดเป็นภาษาไทย อังกฤษมีแค่หัวข้อกับคำโปรยที่หน้าแรกและการค้นหาใช้ตามภาษา
// โครงตามหน้าสินค้า: ต่ำกว่า lg เป็นการ์ด ตั้งแต่ lg เป็นแถว ฟอร์มเป็น sheet จากขอบล่างบนมือถือ
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Result } from '@/lib/admin';
import type { AdminPost, PostInput } from '@/lib/server/posts';
import { deletePostAction, savePostAction, setPostPublishedAction } from '@/app/admin/(panel)/articles/actions';
import ImageField from './ImageField';
import { danger, dangerSolid, ghost, input, label, solid } from './ui';

type Draft = PostInput & { id: number | null };
type LineKey = 'titleTh' | 'titleEn' | 'tagTh' | 'slug';
type AreaKey = 'excerptTh' | 'excerptEn';

const blank = (): Draft => ({
  id: null, slug: '', titleTh: '', titleEn: '', excerptTh: '', excerptEn: '', tagTh: '', bodyTh: '', cover: '', inline: [],
  published: false,
});
const toDraft = ({ date: _d, updated: _u, ...p }: AdminPost): Draft => p;

export default function PostsAdmin({ posts }: { posts: AdminPost[] }) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [form, setForm] = useState<Draft | null>(null);
  const [formError, setFormError] = useState('');
  const [del, setDel] = useState<AdminPost | null>(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const formRef = useRef<HTMLDialogElement>(null);
  const delRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = formRef.current;
    // เปิดและ focus หัวข้อเฉพาะตอนเพิ่งเปิด ไม่ดึง focus ออกจากช่องที่พิมพ์อยู่
    if (form && d && !d.open) {
      d.showModal();
      d.querySelector<HTMLElement>('#post-form-title')?.focus();
    } else if (!form) d?.close();
  }, [form]);
  useEffect(() => {
    if (del) delRef.current?.showModal();
    else delRef.current?.close();
  }, [del]);

  const shown = posts.filter((p) => !q || `${p.titleTh} ${p.titleEn} ${p.tagTh}`.toLowerCase().includes(q.toLowerCase()));
  const set = (patch: Partial<Draft>) => form && setForm({ ...form, ...patch });
  const open = (d: Draft) => {
    setFormError('');
    setForm(d);
  };

  // คืนข้อความผิด หรือ null ถ้าสำเร็จ
  async function run(fn: () => Promise<Result>, done: string): Promise<string | null> {
    setBusy(true);
    let r: Result;
    try {
      r = await fn();
    } catch {
      return 'บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง';
    } finally {
      setBusy(false);
    }
    if (!r.ok) return r.error;
    setMsg(done);
    router.refresh();
    return null;
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    const { id, ...rest } = form;
    const error = await run(() => savePostAction(id, rest), `บันทึก ${form.titleTh} แล้ว`);
    if (error) setFormError(error);
    else setForm(null);
  }

  const line = (k: LineKey, text: string, hint?: string) => (
    <label className={label}>
      {text}
      <input value={form?.[k] ?? ''} onChange={(e) => set({ [k]: e.target.value } as Partial<Draft>)} className={`${input} mt-2`} />
      {hint && <span className="mt-1.5 block text-xs text-stone-600">{hint}</span>}
    </label>
  );
  const area = (k: AreaKey, text: string, hint?: string) => (
    <label className={label}>
      {text}
      <textarea value={form?.[k] ?? ''} onChange={(e) => set({ [k]: e.target.value } as Partial<Draft>)} className={`${input} mt-2 min-h-24 py-2.5`} />
      {hint && <span className="mt-1.5 block text-xs text-stone-600">{hint}</span>}
    </label>
  );
  const search = (
    <input
      type="search"
      value={q}
      onChange={(e) => setQ(e.target.value)}
      placeholder="ค้นหาหัวข้อหรือหมวด"
      aria-label="ค้นหาบทความ"
      className={`${input} lg:max-w-xs`}
    />
  );
  const empty = (
    <>
      <p className="text-sm">ยังไม่มีบทความ</p>
      <button type="button" className={`${solid} mt-5`} onClick={() => open(blank())}>
        เขียนบทความ
      </button>
    </>
  );
  const thumb = (p: AdminPost) => (
    <span className="block h-16 w-28 shrink-0 overflow-hidden rounded-xl bg-white">
      {p.cover && <img src={p.cover} alt="" className="h-full w-full object-cover" />}
    </span>
  );
  const meta = (p: AdminPost) => `${p.tagTh || 'ไม่มีหมวด'} · ${p.published ? `เผยแพร่ ${p.date}` : `แก้ล่าสุด ${p.updated}`}`;
  const status = (p: AdminPost, size: string) => (
    <span className={`shrink-0 rounded-full text-xs ${size} ${p.published ? 'bg-ink text-paper' : 'border border-ink text-ink'}`}>
      {p.published ? 'เผยแพร่' : 'ร่าง'}
    </span>
  );
  const actions = (p: AdminPost, extra: string) => (
    <>
      <button type="button" className={`${ghost} ${extra}`} onClick={() => open(toDraft(p))}>
        แก้ไข
      </button>
      <button
        type="button"
        className={`${ghost} ${extra}`}
        disabled={busy}
        onClick={async () => {
          const error = await run(() => setPostPublishedAction(p.id, !p.published), `${p.published ? 'ซ่อน' : 'เผยแพร่'} ${p.titleTh} แล้ว`);
          if (error) setMsg(error);
        }}
      >
        {p.published ? 'ซ่อน' : 'เผยแพร่'}
      </button>
      <button type="button" className={`${ghost} ${danger} ${extra}`} onClick={() => setDel(p)}>
        ลบ
      </button>
    </>
  );

  return (
    <>
      <header className="glass flex flex-wrap items-end justify-between gap-4 rounded-[28px] p-5 md:p-6">
        <div>
          <h1 className="text-2xl font-extralight tracking-wide md:text-3xl">บทความ</h1>
          <p className="mt-1 text-sm text-stone-600">
            {posts.length} บทความ · เผยแพร่ {posts.filter((p) => p.published).length}
          </p>
        </div>
        <button type="button" className={solid} onClick={() => open(blank())}>
          เขียนบทความ
        </button>
      </header>

      <div role="status" className="min-h-6 px-2 text-sm text-ink">
        {msg}
      </div>

      {/* ต่ำกว่า lg: กล่องค้นหากับการ์ดแยกกัน · ตั้งแต่ lg: แถวในกล่องเดียว (แบบหน้าสินค้า) */}
      <div className="space-y-3 lg:hidden">
        <div className="glass rounded-[28px] p-3">{search}</div>
        {shown.length === 0 ? (
          <div className="glass rounded-[28px] px-6 py-14 text-center">{empty}</div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {shown.map((p) => (
              <li key={p.id} className="glass rounded-[24px] p-3">
                <button type="button" onClick={() => open(toDraft(p))} className="flex w-full items-start gap-3 rounded-2xl p-1 text-left">
                  {thumb(p)}
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2 block text-sm leading-snug">{p.titleTh}</span>
                    <span className="mt-1 block truncate text-xs text-stone-600">{meta(p)}</span>
                    <span className="mt-2 flex items-center gap-2 text-xs">{status(p, 'px-2.5 py-0.5')}</span>
                  </span>
                </button>
                <div className="mt-2 grid grid-cols-3 gap-1.5">{actions(p, 'justify-center bg-white/60')}</div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <section className="glass hidden rounded-[28px] p-4 lg:block">
        <div className="p-2">{search}</div>
        {shown.length === 0 ? (
          <div className="m-2 rounded-2xl border border-dashed border-warm-500 px-6 py-14 text-center">{empty}</div>
        ) : (
          <ul className="divide-y divide-white/70">
            {shown.map((p) => (
              <li key={p.id} className="flex items-center gap-4 rounded-2xl p-2 transition hover:bg-white/50">
                {thumb(p)}
                <div className="min-w-0 flex-1">
                  <button type="button" onClick={() => open(toDraft(p))} className="block max-w-full truncate text-left text-sm hover:underline">
                    {p.titleTh}
                  </button>
                  <p className="truncate text-xs text-stone-600">{meta(p)}</p>
                </div>
                {status(p, 'px-3 py-1')}
                <div className="flex">{actions(p, '')}</div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <dialog
        ref={formRef}
        onClose={() => setForm(null)}
        aria-labelledby="post-form-title"
        className="glass bottom-0 top-auto !m-0 w-full max-w-none overflow-hidden rounded-b-none rounded-t-[28px] p-0 text-ink backdrop:bg-ink/30 backdrop:backdrop-blur-sm md:top-0 md:!m-auto md:w-[min(94vw,760px)] md:rounded-[28px]"
      >
        {/* มือถือ: sheet จากขอบล่าง หัวมีปุ่มยกเลิก ปุ่มบันทึกติดล่าง · ตั้งแต่ md: กล่องกลางจอ */}
        {form && (
          <form onSubmit={save} noValidate className="flex max-h-[92dvh] flex-col md:max-h-[85dvh]">
            <div className="flex items-center gap-2 border-b border-white/70 px-3 py-2 md:border-0 md:px-6 md:pt-6">
              <button type="button" className={`${ghost} md:hidden`} onClick={() => setForm(null)}>
                ยกเลิก
              </button>
              <h2 id="post-form-title" tabIndex={-1} className="min-w-0 truncate text-base font-light outline-none md:text-xl">
                {form.id === null ? 'เขียนบทความ' : `แก้ไข ${form.titleTh}`}
              </h2>
            </div>
            <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-4 md:px-6">
              <div className="grid gap-4 md:grid-cols-2">
                {line('titleTh', 'ไทย: หัวข้อ (จำเป็น)')}
                {line('titleEn', 'English: หัวข้อ', 'เว้นว่าง = ใช้ภาษาไทย')}
                {area('excerptTh', 'ไทย: คำโปรย')}
                {area('excerptEn', 'English: คำโปรย', 'เว้นว่าง = ใช้ภาษาไทย')}
                {line('tagTh', 'หมวดบทความ', 'เช่น ไอเดียครัว หรือ คู่มือเลือกซื้อ')}
                {line('slug', 'slug (ส่วนท้ายลิงก์)', 'เว้นว่างได้ ระบบสร้างจากหัวข้อภาษาอังกฤษ · ใช้ a-z ตัวเลข และ -')}
              </div>
              <label className={label}>
                เนื้อหา (จำเป็น)
                <span className="mt-1 block text-xs text-stone-600">เว้นบรรทัดว่าง 1 บรรทัดระหว่างย่อหน้า · หน้าเว็บแทรกรูปประกอบหลังย่อหน้าที่ 2 และ 4</span>
                <textarea value={form.bodyTh} onChange={(e) => set({ bodyTh: e.target.value })} className={`${input} mt-2 min-h-64 py-2.5`} />
              </label>
              <div>
                <p className={label}>รูปปก 16:9 (จำเป็น)</p>
                <ImageField value={form.cover ? [form.cover] : []} onChange={(x) => set({ cover: x[0] ?? '' })} multiple={false} />
              </div>
              <div>
                <p className={label}>รูปประกอบ ไม่เกิน 2 รูป</p>
                <ImageField value={form.inline} onChange={(inline) => set({ inline })} max={2} />
              </div>
              <label className="flex min-h-11 items-center gap-3 text-sm">
                <input type="checkbox" checked={form.published} onChange={(e) => set({ published: e.target.checked })} className="h-4 w-4 accent-ink" />
                เผยแพร่บนหน้าเว็บ
              </label>
            </div>
            <div className="space-y-2 border-t border-white/70 px-5 pt-3 md:border-0 md:px-6 md:pb-6" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
              <p role="alert" className={`min-h-5 text-sm ${danger}`}>
                {formError}
              </p>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <button type="button" className={`${ghost} hidden md:inline-flex`} onClick={() => setForm(null)}>
                  ยกเลิก
                </button>
                <button type="submit" className={`${solid} w-full justify-center md:w-auto`} disabled={busy}>
                  {busy ? 'กำลังบันทึก' : 'บันทึก'}
                </button>
              </div>
            </div>
          </form>
        )}
      </dialog>

      <dialog
        ref={delRef}
        onClose={() => setDel(null)}
        aria-labelledby="post-del-title"
        className="bottom-0 top-auto !m-0 w-full max-w-none bg-transparent p-0 text-ink backdrop:bg-ink/30 md:top-0 md:!m-auto md:w-[min(92vw,440px)]"
      >
        {/* มือถือ: sheet จากขอบล่าง ปุ่ม 2 ช่องเท่ากัน · ตั้งแต่ md: กล่องกลางจอ */}
        {del && (
          <div className="glass m-2 rounded-[28px] p-6 md:m-0" style={{ marginBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}>
            <h2 id="post-del-title" className="text-lg font-light">
              ลบ {del.titleTh}
            </h2>
            <p className="mt-3 text-sm text-stone-600">บทความนี้จะหายจากหน้าเว็บ และกู้คืนไม่ได้ ถ้าแค่ไม่อยากให้เห็น ใช้ปุ่มซ่อนแทน</p>
            <div className="mt-6 grid grid-cols-2 gap-2 md:flex md:justify-end">
              <button type="button" autoFocus className={`${ghost} justify-center bg-white/60 md:bg-transparent`} onClick={() => setDel(null)}>
                ยกเลิก
              </button>
              <button
                type="button"
                className={`${dangerSolid} justify-center`}
                disabled={busy}
                onClick={async () => {
                  const error = await run(() => deletePostAction(del.id), `ลบ ${del.titleTh} แล้ว`);
                  if (error) setMsg(error);
                  setDel(null);
                }}
              >
                ลบ
              </button>
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}
```

- [ ] **Step 8: Typecheck and verify in the browser, deciding from the database**

```bash
npx tsc --noEmit 2>&1 | grep -v '\.next/types'
grep -rn "lib/posts'" app components
```
Expected: tsc prints nothing; grep prints only `components/CatalogProvider.tsx` (a `import type`). The seed (`db/seed.mjs`) and `scripts/check-search.mjs` still read `lib/posts.ts` on purpose.

Run Q0 and Q1. `PSQL="psql -h localhost -p 5433 -d iterra_dev -At"`.

1. Before editing anything: `/articles/` lists 5 articles; `/articles/matte-black-kitchen/` shows 5 paragraphs and 2 inline images (`evaluate_script`: `[document.querySelectorAll('article p.mb-8').length, document.querySelectorAll('article img').length]` gives `[5, 3]`: cover plus 2 inline). `/` shows 3 latest articles. Screenshot.
2. `/admin/articles/` lists 5 articles, all `เผยแพร่`. At 375 px width (`resize_page` 375x812) the cards show and the bottom bar has 2 icons plus the person icon; the sheet "อื่น ๆ" lists หมวด แบรนด์ วัสดุ and ประกาศ as links. Back to 1280 px.
3. เขียนบทความ: Thai title `QA บทความทดสอบ`, slug `qa-post-check`, body `ย่อหน้าหนึ่ง` blank line `ย่อหน้าสอง`, upload `public/media/scenes/about-hero.webp` as cover (`upload_file` with the absolute path), leave เผยแพร่ unticked, save. DB: `$PSQL -c "select published_at is null, cover like '/uploads/%' from posts where slug = 'qa-post-check'"` prints `t|t`. `curl -s -o /dev/null -w '%{http_code}\n' http://localhost:4100/articles/qa-post-check/` prints `404`.
4. Press เผยแพร่ on it. DB: `published_at` equals today (`$PSQL -c "select published_at = (now() at time zone 'Asia/Bangkok')::date from posts where slug = 'qa-post-check'"` prints `t`). `/articles/` shows it first; the curl above prints `200`; `/` latest articles shows it first.
5. Edit it and put `<b>` in the body: the form shows `ห้ามใช้เครื่องหมาย < หรือ >`; DB body unchanged.
6. Delete it (dialog, ลบ). DB: `$PSQL -c "select count(*) from posts where slug = 'qa-post-check'"` prints `0`.
7. Audit: `$PSQL -c "select a.action, a.entity from audit_log a join admin_users u on u.id = a.user_id where u.email = 'qa@iterra.test' order by a.id"` contains, in order, `login|admin_user`, `upload|file`, `create|post`, `publish|post`, `delete|post`.
8. `curl -s http://localhost:4100/sitemap.xml | grep -c '/articles/[a-z]'` prints `5`.
9. `list_console_messages` (errors only) prints nothing on `/articles/`, one article page, `/` and `/admin/articles/`.

Run Q2 (it deletes the uploaded cover file).

- [ ] **Step 9: Gates, commit and push**

```bash
npx tsc --noEmit 2>&1 | grep -v '\.next/types'
npm run check:db && npm run check:filter && npm run check:search
npm run build
npm run check:overflow
git add lib/posts.ts lib/server/posts.ts 'app/admin/(panel)/articles' components/admin/PostsAdmin.tsx components/admin/ImageField.tsx components/admin/AdminShell.tsx app/articles app/sitemap.ts components/CatalogProvider.tsx app/layout.tsx components/home/HomeContent.tsx components/SearchPanel.tsx scripts/check-db.mjs
npm run check:text
git commit -m "feat: manage articles from the admin and read them from the database" && git push
```

---

### Task 3: Projects on the database, with a product picker

**Files:**
- Create: `lib/server/projects.ts`, `app/admin/(panel)/projects/page.tsx`, `app/admin/(panel)/projects/actions.ts`, `components/admin/ProjectsAdmin.tsx`
- Modify: `components/admin/AdminShell.tsx`, `components/CatalogProvider.tsx`, `app/layout.tsx`, `components/ProjectsContent.tsx`, `components/SearchPanel.tsx`
- Test: `scripts/check-db.mjs`

**Interfaces:**
- Consumes: `adminAction`, `audit` (Task 1); `listAdmin(db): Promise<AdminProduct[]>` from `lib/server/products.ts` (fields `id`, `th`, `published`); `type Project` from `lib/projects.ts` (`{ slug; name; location; type: {th,en}; year: number; images: string[]; products: string[] }`); `useCatalog()` with `posts` (Task 2); icon `house` (Task 2).
- Produces:
  - in `lib/server/projects.ts`: `type AdminProject`, `type ProjectInput`, `listAdminProjects(db)`, `saveProject(db, id: number | null, input): Promise<number>`, `setProjectPublished(db, id, published)`, `deleteProject(db, id): Promise<string | null>`, `listPublishedProjects(db): Promise<Project[]>`
  - `useCatalog().projects: Project[]`
  - `type ProductOption = { id: number; th: string; published: boolean }` exported from `components/admin/ProjectsAdmin.tsx`

- [ ] **Step 1: Write the failing test**

In `scripts/check-db.mjs`, replace
```js
import { migrate } from './db-migrate.mjs';
```
with
```js
import { migrate } from './db-migrate.mjs';
import * as proj from '../lib/server/projects.ts';
```

Replace
```js
  console.log('ผ่าน: ฐานข้อมูล');
```
with
```js
  // ── ผลงาน (แผน 2 Task 3) ──
  {
    // หน้าเว็บ: ตรงกับข้อมูลเดิม (สินค้าเทียบเป็นชุด เพราะเรียงตาม sort ของสินค้า project_products ไม่มีลำดับ)
    const pub = await proj.listPublishedProjects(c);
    assert.deepEqual(pub.map((p) => p.slug), projects.map((p) => p.slug));
    for (const seedP of projects) {
      const p = pub.find((x) => x.slug === seedP.slug);
      assert.deepEqual(
        { ...p, products: [...p.products].sort() },
        { ...seedP, products: [...new Set(seedP.products)].sort() },
        `ผลงาน ${seedP.slug} จาก DB ต้องตรงกับข้อมูลเดิม`,
      );
    }
    // หลังบ้าน: สร้างแบบยังไม่เผยแพร่ สินค้าซ้ำเก็บครั้งเดียว
    const ids = (await prod.listAdmin(c)).slice(0, 2).map((p) => p.id);
    const num = (a) => [...a].sort((x, y) => x - y);
    const draft = {
      slug: '', th: 'บ้านทดสอบ', en: 'Test House', locationTh: 'กรุงเทพฯ', locationEn: '', typeTh: 'บ้านเดี่ยว', typeEn: '',
      year: '2026', images: ['/uploads/2026/10/a.webp'], products: [ids[0], ids[1], ids[0]], published: false,
    };
    const id = await proj.saveProject(c, null, draft);
    const row = (await proj.listAdminProjects(c)).find((p) => p.id === id);
    assert.equal(row.slug, 'test-house', 'slug ว่าง = สร้างจากชื่ออังกฤษ');
    assert.deepEqual(num(row.products), num(ids));
    assert.equal(row.year, '2026');
    assert.ok(!(await proj.listPublishedProjects(c)).some((p) => p.slug === 'test-house'), 'ยังไม่เผยแพร่ ต้องไม่เห็น');
    await proj.setProjectPublished(c, id, true);
    const shown = (await proj.listPublishedProjects(c)).find((p) => p.slug === 'test-house');
    assert.ok(shown, 'เผยแพร่แล้วต้องเห็น');
    assert.deepEqual(shown.location, { th: 'กรุงเทพฯ', en: 'กรุงเทพฯ' }, 'ไม่กรอกอังกฤษ = ใช้ไทย');
    assert.equal(shown.year, 2026);
    assert.equal((await proj.listPublishedProjects(c)).at(-1).slug, 'test-house', 'ผลงานใหม่ไปอยู่ท้าย');
    // แก้รายการสินค้า = แทนทั้งชุด · สินค้าที่ซ่อนอยู่ไม่โผล่บนหน้าเว็บ
    await proj.saveProject(c, id, { ...draft, slug: 'test-house', products: [ids[1]], published: true });
    assert.deepEqual((await proj.listAdminProjects(c)).find((p) => p.id === id).products, [ids[1]]);
    await c.query('update products set published = false where id = $1', [ids[1]]);
    assert.deepEqual((await proj.listPublishedProjects(c)).find((p) => p.slug === 'test-house').products, []);
    await c.query('update products set published = true where id = $1', [ids[1]]);
    assert.equal((await proj.listPublishedProjects(c)).find((p) => p.slug === 'test-house').products.length, 1);
    // ข้อมูลผิด
    await assert.rejects(proj.saveProject(c, null, { ...draft, th: '' }), /ชื่อผลงาน/);
    await assert.rejects(proj.saveProject(c, null, { ...draft, year: '26' }), /ปี/);
    await assert.rejects(proj.saveProject(c, null, { ...draft, year: '1500' }), /ปี/);
    await assert.rejects(proj.saveProject(c, null, { ...draft, images: [] }), /อย่างน้อย 1 รูป/);
    await assert.rejects(proj.saveProject(c, null, { ...draft, images: ['javascript:alert(1)'] }), /ที่อยู่รูป/);
    await assert.rejects(proj.saveProject(c, null, { ...draft, products: [999999] }), /ไม่พบสินค้า/);
    await assert.rejects(proj.saveProject(c, null, { ...draft, products: ['1'] }), /ไม่พบสินค้า/);
    await assert.rejects(proj.saveProject(c, null, { ...draft, locationTh: 'กทม<b>' }), /< หรือ >/);
    await assert.rejects(proj.saveProject(c, null, { ...draft, typeEn: 'House >' }), /< หรือ >/);
    await assert.rejects(proj.saveProject(c, null, { ...draft, slug: 'test-house' }), (e) => e.code === '23505');
    // ลบ: ลิงก์สินค้าหายตาม (on delete cascade) แต่สินค้ายังอยู่
    assert.equal(await proj.deleteProject(c, id), 'test-house');
    assert.equal(await proj.deleteProject(c, id), null);
    assert.equal(await count(`project_products where project_id = ${id}`), 0);
    assert.equal(await count(`products where id = ${ids[1]}`), 1);
    await assert.rejects(proj.saveProject(c, id, draft), /ไม่พบผลงานนี้/);
    await assert.rejects(proj.setProjectPublished(c, id, true), /ไม่พบผลงานนี้/);
  }
  console.log('ผ่าน: ฐานข้อมูล');
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm run check:db`
Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `lib/server/projects.ts`.

- [ ] **Step 3: Write the data module**

Create `lib/server/projects.ts`:

```ts
// ผลงานอ้างอิง: เขียนจากหลังบ้าน และอ่านให้หน้าเว็บ (เฉพาะ published)
// import แค่ type เพื่อให้ scripts/check-db.mjs รันไฟล์นี้ด้วย Node ได้ตรง ๆ
// สินค้าในผลงานเรียงตาม sort ของสินค้า เพราะ project_products ไม่มีคอลัมน์ลำดับ · หน้าเว็บเห็นเฉพาะสินค้าที่เผยแพร่
import type { Project } from '../projects';

type Db = { query(text: string, values?: unknown[]): Promise<{ rows: any[]; rowCount: number | null }> };

export class InputError extends Error {
  name = 'InputError';
}

export type AdminProject = {
  id: number;
  slug: string;
  th: string;
  en: string;
  locationTh: string;
  locationEn: string;
  typeTh: string;
  typeEn: string;
  year: string; // ค.ศ. 4 หลัก เป็นข้อความตามช่องในฟอร์ม
  images: string[]; // รูปแรกแสดงตอนเปิดหน้า
  products: number[]; // id ของสินค้าที่ใช้
  published: boolean;
};
export type ProjectInput = Omit<AdminProject, 'id'>;

const GONE = 'ไม่พบผลงานนี้ อาจถูกลบไปแล้ว';
const NO_PRODUCT = 'ไม่พบสินค้าบางรายการ อาจถูกลบไปแล้ว';
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
// รูปต้องเป็นไฟล์ในเว็บเอง: ของเดิมใน public/media หรือที่อัปโหลดใน /uploads
const okImage = (s: unknown) => typeof s === 'string' && /^\/(media|uploads)\/[\w./-]+$/.test(s) && !s.includes('..');
// < และ > ไม่มีเหตุให้ใช้ในข้อความหลังบ้าน ปฏิเสธไว้ก่อน เผื่อวันหน้ามีที่ไหนเผลอแสดงเป็น HTML
function text(v: unknown, max: number, required = ''): string {
  const s = typeof v === 'string' ? v.trim() : '';
  if (required && !s) throw new InputError(required);
  if (/[<>]/.test(s)) throw new InputError('ห้ามใช้เครื่องหมาย < หรือ >');
  if (s.length > max) throw new InputError(`ยาวเกิน ${max} ตัวอักษร`);
  return s;
}
const slugFrom = (en: string) => en.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 80).replace(/^-+|-+$/g, '');
const SELECT = `select p.*, p.id::int as pid,
         array(select pp.product_id::int from project_products pp join products pr on pr.id = pp.product_id
                where pp.project_id = p.id order by pr.sort, pr.id) as product_ids,
         array(select pr.slug from project_products pp join products pr on pr.id = pp.product_id
                where pp.project_id = p.id and pr.published order by pr.sort, pr.id) as product_slugs
    from projects p`;

export async function listAdminProjects(db: Db): Promise<AdminProject[]> {
  const r = await db.query(`${SELECT} order by p.sort, p.id`);
  return r.rows.map((x) => ({
    id: x.pid,
    slug: x.slug,
    th: x.name_th,
    en: x.name_en,
    locationTh: x.location_th,
    locationEn: x.location_en,
    typeTh: x.type_th,
    typeEn: x.type_en,
    year: x.year === null ? '' : String(x.year),
    images: x.images,
    products: x.product_ids,
    published: x.published,
  }));
}

// คืน id · รายการสินค้าแทนทั้งชุดทุกครั้งที่บันทึก · ผลงานใหม่ไปอยู่ท้าย
export async function saveProject(db: Db, id: number | null, input: ProjectInput): Promise<number> {
  if (id !== null && !Number.isInteger(id)) throw new InputError(GONE);
  const th = text(input.th, 120, 'กรุณากรอกชื่อผลงานภาษาไทย');
  const en = text(input.en, 120);
  const locationTh = text(input.locationTh, 120);
  const typeTh = text(input.typeTh, 120);
  const slug = text(input.slug, 80) || slugFrom(en) || `project-${Date.now().toString(36)}`;
  if (!SLUG.test(slug)) throw new InputError('slug ใช้ a-z ตัวเลข และ - เท่านั้น');
  const year = text(input.year, 10);
  if (!/^\d{4}$/.test(year) || Number(year) < 1900 || Number(year) > 2100) {
    throw new InputError('กรุณากรอกปีที่เสร็จเป็น ค.ศ. 4 หลัก เช่น 2026');
  }
  const images = Array.isArray(input.images) ? input.images : [];
  if (images.length === 0) throw new InputError('กรุณาใส่รูปอย่างน้อย 1 รูป');
  if (!images.every(okImage)) throw new InputError('ที่อยู่รูปไม่ถูกต้อง');
  const ids = [...new Set(Array.isArray(input.products) ? input.products : [])];
  if (!ids.every((x) => Number.isInteger(x))) throw new InputError(NO_PRODUCT);
  if (ids.length) {
    const found = await db.query('select count(*)::int as n from products where id = any($1::bigint[])', [ids]);
    if (found.rows[0].n !== ids.length) throw new InputError(NO_PRODUCT);
  }
  const v = [
    slug, th, en || th, locationTh, text(input.locationEn, 120) || locationTh, typeTh, text(input.typeEn, 120) || typeTh,
    Number(year), images, input.published === true,
  ];
  let pid: number;
  if (id === null) {
    const r = await db.query(
      `insert into projects (slug, name_th, name_en, location_th, location_en, type_th, type_en, year, images, published, sort)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, (select coalesce(max(sort), 0) + 1 from projects))
       returning id::int as id`,
      v,
    );
    pid = r.rows[0].id;
  } else {
    const r = await db.query(
      `update projects set slug = $1, name_th = $2, name_en = $3, location_th = $4, location_en = $5, type_th = $6, type_en = $7,
         year = $8, images = $9, published = $10
       where id = $11`,
      [...v, id],
    );
    if (r.rowCount === 0) throw new InputError(GONE);
    pid = id;
  }
  await db.query('delete from project_products where project_id = $1', [pid]);
  if (ids.length) {
    await db.query('insert into project_products (project_id, product_id) select $1, unnest($2::bigint[])', [pid, ids]);
  }
  return pid;
}

export async function setProjectPublished(db: Db, id: number, published: boolean): Promise<void> {
  if (!Number.isInteger(id)) throw new InputError(GONE);
  const r = await db.query('update projects set published = $2 where id = $1', [id, published === true]);
  if (r.rowCount === 0) throw new InputError(GONE);
}

// คืน slug ของแถวที่ลบ ให้ audit อ่านย้อนหลังได้ · ไม่มีแถวแล้ว = null · project_products หายตาม (on delete cascade)
export async function deleteProject(db: Db, id: number): Promise<string | null> {
  if (!Number.isInteger(id)) throw new InputError(GONE);
  const r = await db.query('delete from projects where id = $1 returning slug', [id]);
  return r.rows[0]?.slug ?? null;
}

// ── อ่านให้หน้าเว็บ · เฉพาะที่เผยแพร่ ──
export async function listPublishedProjects(db: Db): Promise<Project[]> {
  const r = await db.query(`${SELECT} where p.published order by p.sort, p.id`);
  return r.rows.map((x) => ({
    slug: x.slug,
    name: { th: x.name_th, en: x.name_en },
    location: { th: x.location_th, en: x.location_en },
    type: { th: x.type_th, en: x.type_en },
    year: x.year,
    images: x.images,
    products: x.product_slugs,
  }));
}
```

- [ ] **Step 4: Run the test and watch it pass**

Run: `npm run check:db`
Expected: `ผ่าน: ฐานข้อมูล`

- [ ] **Step 5: Public page and search read the database**

In `components/CatalogProvider.tsx`, replace
```tsx
import type { PostCard } from '@/lib/posts';
```
with
```tsx
import type { PostCard } from '@/lib/posts';
import type { Project } from '@/lib/projects';
```
replace
```tsx
type Catalog = { products: Product[]; categories: Cat[]; materials: Mat[]; posts: PostCard[] };

const Ctx = createContext<Catalog>({ products: [], categories: [], materials: [], posts: [] });
```
with
```tsx
type Catalog = { products: Product[]; categories: Cat[]; materials: Mat[]; posts: PostCard[]; projects: Project[] };

const Ctx = createContext<Catalog>({ products: [], categories: [], materials: [], posts: [], projects: [] });
```
and replace the first comment line
```tsx
// ข้อมูลจาก DB ที่ component ฝั่ง client ใช้หลายหน้า: สินค้าที่เผยแพร่ หมวด วัสดุ และการ์ดบทความ (หน้าแรกกับการค้นหา)
```
with
```tsx
// ข้อมูลจาก DB ที่ component ฝั่ง client ใช้หลายหน้า: สินค้าที่เผยแพร่ หมวด วัสดุ การ์ดบทความ และผลงาน (หน้าผลงานกับการค้นหา)
```

In `app/layout.tsx`, replace
```tsx
import { listPublishedPosts } from '@/lib/server/posts';
```
with
```tsx
import { listPublishedPosts } from '@/lib/server/posts';
import { listPublishedProjects } from '@/lib/server/projects';
```
replace
```tsx
  const [products, categories, materials, announcement, posts] = await Promise.all([
    listPublished(db),
    listCategories(db),
    listMaterials(db),
    getAnnouncement(db),
    listPublishedPosts(db),
  ]);
```
with
```tsx
  const [products, categories, materials, announcement, posts, projects] = await Promise.all([
    listPublished(db),
    listCategories(db),
    listMaterials(db),
    getAnnouncement(db),
    listPublishedPosts(db),
    listPublishedProjects(db),
  ]);
```
and replace
```tsx
          <CatalogProvider value={{ products, categories, materials, posts }}>
```
with
```tsx
          <CatalogProvider value={{ products, categories, materials, posts, projects }}>
```

In `components/ProjectsContent.tsx`, delete the line
```tsx
import { projects } from '@/lib/projects';
```
and replace
```tsx
  const { products } = useCatalog();
```
with
```tsx
  const { products, projects } = useCatalog();
```

In `components/SearchPanel.tsx`, delete the line
```tsx
import { projects } from '@/lib/projects';
```
and replace
```tsx
  const { products, posts } = useCatalog();
  const index = useMemo(() => buildIndex({ products, posts, projects, pages: PAGES }), [products, posts]);
```
with
```tsx
  const { products, posts, projects } = useCatalog();
  const index = useMemo(() => buildIndex({ products, posts, projects, pages: PAGES }), [products, posts, projects]);
```

- [ ] **Step 6: Admin actions, page, menu and screen**

Create `app/admin/(panel)/projects/actions.ts`:

```ts
'use server';

import { adminAction } from '@/lib/admin';
import { audit } from '@/lib/server/audit';
import { deleteProject, saveProject, setProjectPublished, type ProjectInput } from '@/lib/server/projects';

// ทุกตัวผ่าน adminAction: ตรวจ session แล้วรันการแก้กับ audit ใน transaction เดียว
export async function saveProjectAction(id: number | null, input: ProjectInput) {
  return adminAction(async (tx, a) => {
    const pid = await saveProject(tx, id, input);
    await audit(tx, a.id, id === null ? 'create' : 'update', 'project', pid, { name: String(input.th).trim() });
  });
}
export async function deleteProjectAction(id: number) {
  return adminAction(async (tx, a) => {
    const slug = await deleteProject(tx, id);
    if (slug) await audit(tx, a.id, 'delete', 'project', id, { slug });
  });
}
export async function setProjectPublishedAction(id: number, published: boolean) {
  return adminAction(async (tx, a) => {
    await setProjectPublished(tx, id, published);
    await audit(tx, a.id, published === true ? 'publish' : 'unpublish', 'project', id);
  });
}
```

Create `app/admin/(panel)/projects/page.tsx`:

```tsx
import type { Metadata } from 'next';
import ProjectsAdmin from '@/components/admin/ProjectsAdmin';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/admin';
import { listAdmin } from '@/lib/server/products';
import { listAdminProjects } from '@/lib/server/projects';

export const metadata: Metadata = { title: 'ผลงาน' };

export default async function AdminProjectsPage() {
  await requireAdmin();
  const [projects, products] = await Promise.all([listAdminProjects(db), listAdmin(db)]);
  // ส่งแค่ที่ตัวเลือกสินค้าต้องใช้ ไม่ส่งข้อมูลสินค้าทั้งแถวไปฝั่ง client
  const options = products.map((p) => ({ id: p.id, th: p.th, published: p.published })).sort((a, b) => a.th.localeCompare(b.th, 'th'));
  return <ProjectsAdmin projects={projects} products={options} />;
}
```

In `components/admin/AdminShell.tsx`, replace
```tsx
  { href: '/admin/articles/', label: 'บทความ', icon: 'doc', bar: true },
```
with
```tsx
  { href: '/admin/articles/', label: 'บทความ', icon: 'doc', bar: true },
  { href: '/admin/projects/', label: 'ผลงาน', icon: 'house', bar: true },
```

Create `components/admin/ProjectsAdmin.tsx`:

```tsx
'use client';

// หลังบ้าน: ผลงานอ้างอิง · ข้อมูลจาก DB ทาง props · แก้ผ่าน Server Functions แล้ว router.refresh() ดึงรายการใหม่
// เลือกสินค้าที่ใช้จากรายการติ๊ก ค้นชื่อได้ · สินค้าที่ซ่อนอยู่เลือกได้ แต่หน้าเว็บไม่แสดง
// โครงตามหน้าสินค้า: ต่ำกว่า lg เป็นการ์ด ตั้งแต่ lg เป็นแถว ฟอร์มเป็น sheet จากขอบล่างบนมือถือ
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Result } from '@/lib/admin';
import type { AdminProject, ProjectInput } from '@/lib/server/projects';
import { deleteProjectAction, saveProjectAction, setProjectPublishedAction } from '@/app/admin/(panel)/projects/actions';
import ImageField from './ImageField';
import { danger, dangerSolid, ghost, input, label, solid } from './ui';

export type ProductOption = { id: number; th: string; published: boolean };
type Draft = ProjectInput & { id: number | null };
type LineKey = 'th' | 'en' | 'locationTh' | 'locationEn' | 'typeTh' | 'typeEn' | 'year' | 'slug';

const blank = (): Draft => ({
  id: null, slug: '', th: '', en: '', locationTh: '', locationEn: '', typeTh: '', typeEn: '', year: '', images: [], products: [],
  published: false,
});

export default function ProjectsAdmin({ projects, products }: { projects: AdminProject[]; products: ProductOption[] }) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [pq, setPq] = useState('');
  const [form, setForm] = useState<Draft | null>(null);
  const [formError, setFormError] = useState('');
  const [del, setDel] = useState<AdminProject | null>(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const formRef = useRef<HTMLDialogElement>(null);
  const delRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = formRef.current;
    // เปิดและ focus หัวข้อเฉพาะตอนเพิ่งเปิด ไม่ดึง focus ออกจากช่องที่พิมพ์อยู่
    if (form && d && !d.open) {
      d.showModal();
      d.querySelector<HTMLElement>('#project-form-title')?.focus();
    } else if (!form) d?.close();
  }, [form]);
  useEffect(() => {
    if (del) delRef.current?.showModal();
    else delRef.current?.close();
  }, [del]);

  const shown = projects.filter((p) => !q || `${p.th} ${p.en} ${p.locationTh} ${p.typeTh}`.toLowerCase().includes(q.toLowerCase()));
  const picks = products.filter((p) => !pq || p.th.toLowerCase().includes(pq.toLowerCase()));
  const set = (patch: Partial<Draft>) => form && setForm({ ...form, ...patch });
  const open = (d: Draft) => {
    setFormError('');
    setPq('');
    setForm(d);
  };

  // คืนข้อความผิด หรือ null ถ้าสำเร็จ
  async function run(fn: () => Promise<Result>, done: string): Promise<string | null> {
    setBusy(true);
    let r: Result;
    try {
      r = await fn();
    } catch {
      return 'บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง';
    } finally {
      setBusy(false);
    }
    if (!r.ok) return r.error;
    setMsg(done);
    router.refresh();
    return null;
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    const { id, ...rest } = form;
    const error = await run(() => saveProjectAction(id, rest), `บันทึก ${form.th} แล้ว`);
    if (error) setFormError(error);
    else setForm(null);
  }

  const line = (k: LineKey, text: string, hint?: string) => (
    <label className={label}>
      {text}
      <input
        value={form?.[k] ?? ''}
        inputMode={k === 'year' ? 'numeric' : undefined}
        onChange={(e) => set({ [k]: e.target.value } as Partial<Draft>)}
        className={`${input} mt-2`}
      />
      {hint && <span className="mt-1.5 block text-xs text-stone-600">{hint}</span>}
    </label>
  );
  const search = (
    <input
      type="search"
      value={q}
      onChange={(e) => setQ(e.target.value)}
      placeholder="ค้นหาชื่อ ที่ตั้ง หรือประเภท"
      aria-label="ค้นหาผลงาน"
      className={`${input} lg:max-w-xs`}
    />
  );
  const empty = (
    <>
      <p className="text-sm">ยังไม่มีผลงาน</p>
      <button type="button" className={`${solid} mt-5`} onClick={() => open(blank())}>
        เพิ่มผลงาน
      </button>
    </>
  );
  const thumb = (p: AdminProject) => (
    <span className="block h-16 w-24 shrink-0 overflow-hidden rounded-xl bg-white">
      {p.images[0] && <img src={p.images[0]} alt="" className="h-full w-full object-cover" />}
    </span>
  );
  const meta = (p: AdminProject) => `${p.typeTh || 'ไม่ระบุประเภท'} · ${p.locationTh || 'ไม่ระบุที่ตั้ง'} · ${p.year} · สินค้า ${p.products.length} รายการ`;
  const status = (p: AdminProject, size: string) => (
    <span className={`shrink-0 rounded-full text-xs ${size} ${p.published ? 'bg-ink text-paper' : 'border border-ink text-ink'}`}>
      {p.published ? 'เผยแพร่' : 'ซ่อน'}
    </span>
  );
  const actions = (p: AdminProject, extra: string) => (
    <>
      <button type="button" className={`${ghost} ${extra}`} onClick={() => open({ ...p })}>
        แก้ไข
      </button>
      <button
        type="button"
        className={`${ghost} ${extra}`}
        disabled={busy}
        onClick={async () => {
          const error = await run(() => setProjectPublishedAction(p.id, !p.published), `${p.published ? 'ซ่อน' : 'แสดง'} ${p.th} แล้ว`);
          if (error) setMsg(error);
        }}
      >
        {p.published ? 'ซ่อน' : 'แสดง'}
      </button>
      <button type="button" className={`${ghost} ${danger} ${extra}`} onClick={() => setDel(p)}>
        ลบ
      </button>
    </>
  );

  return (
    <>
      <header className="glass flex flex-wrap items-end justify-between gap-4 rounded-[28px] p-5 md:p-6">
        <div>
          <h1 className="text-2xl font-extralight tracking-wide md:text-3xl">ผลงาน</h1>
          <p className="mt-1 text-sm text-stone-600">
            {projects.length} ผลงาน · เผยแพร่ {projects.filter((p) => p.published).length}
          </p>
        </div>
        <button type="button" className={solid} onClick={() => open(blank())}>
          เพิ่มผลงาน
        </button>
      </header>

      <div role="status" className="min-h-6 px-2 text-sm text-ink">
        {msg}
      </div>

      {/* ต่ำกว่า lg: กล่องค้นหากับการ์ดแยกกัน · ตั้งแต่ lg: แถวในกล่องเดียว (แบบหน้าสินค้า) */}
      <div className="space-y-3 lg:hidden">
        <div className="glass rounded-[28px] p-3">{search}</div>
        {shown.length === 0 ? (
          <div className="glass rounded-[28px] px-6 py-14 text-center">{empty}</div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {shown.map((p) => (
              <li key={p.id} className="glass rounded-[24px] p-3">
                <button type="button" onClick={() => open({ ...p })} className="flex w-full items-start gap-3 rounded-2xl p-1 text-left">
                  {thumb(p)}
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2 block text-sm leading-snug">{p.th}</span>
                    <span className="mt-1 block truncate text-xs text-stone-600">{meta(p)}</span>
                    <span className="mt-2 flex items-center gap-2 text-xs">{status(p, 'px-2.5 py-0.5')}</span>
                  </span>
                </button>
                <div className="mt-2 grid grid-cols-3 gap-1.5">{actions(p, 'justify-center bg-white/60')}</div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <section className="glass hidden rounded-[28px] p-4 lg:block">
        <div className="p-2">{search}</div>
        {shown.length === 0 ? (
          <div className="m-2 rounded-2xl border border-dashed border-warm-500 px-6 py-14 text-center">{empty}</div>
        ) : (
          <ul className="divide-y divide-white/70">
            {shown.map((p) => (
              <li key={p.id} className="flex items-center gap-4 rounded-2xl p-2 transition hover:bg-white/50">
                {thumb(p)}
                <div className="min-w-0 flex-1">
                  <button type="button" onClick={() => open({ ...p })} className="block max-w-full truncate text-left text-sm hover:underline">
                    {p.th}
                  </button>
                  <p className="truncate text-xs text-stone-600">{meta(p)}</p>
                </div>
                {status(p, 'px-3 py-1')}
                <div className="flex">{actions(p, '')}</div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <dialog
        ref={formRef}
        onClose={() => setForm(null)}
        aria-labelledby="project-form-title"
        className="glass bottom-0 top-auto !m-0 w-full max-w-none overflow-hidden rounded-b-none rounded-t-[28px] p-0 text-ink backdrop:bg-ink/30 backdrop:backdrop-blur-sm md:top-0 md:!m-auto md:w-[min(94vw,720px)] md:rounded-[28px]"
      >
        {/* มือถือ: sheet จากขอบล่าง หัวมีปุ่มยกเลิก ปุ่มบันทึกติดล่าง · ตั้งแต่ md: กล่องกลางจอ */}
        {form && (
          <form onSubmit={save} noValidate className="flex max-h-[92dvh] flex-col md:max-h-[85dvh]">
            <div className="flex items-center gap-2 border-b border-white/70 px-3 py-2 md:border-0 md:px-6 md:pt-6">
              <button type="button" className={`${ghost} md:hidden`} onClick={() => setForm(null)}>
                ยกเลิก
              </button>
              <h2 id="project-form-title" tabIndex={-1} className="min-w-0 truncate text-base font-light outline-none md:text-xl">
                {form.id === null ? 'เพิ่มผลงาน' : `แก้ไข ${form.th}`}
              </h2>
            </div>
            <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-4 md:px-6">
              <div className="grid gap-4 md:grid-cols-2">
                {line('th', 'ไทย: ชื่อผลงาน (จำเป็น)')}
                {line('en', 'English: ชื่อผลงาน', 'เว้นว่าง = ใช้ภาษาไทย')}
                {line('locationTh', 'ไทย: ที่ตั้ง')}
                {line('locationEn', 'English: ที่ตั้ง', 'เว้นว่าง = ใช้ภาษาไทย')}
                {line('typeTh', 'ไทย: ประเภทโครงการ')}
                {line('typeEn', 'English: ประเภทโครงการ', 'เว้นว่าง = ใช้ภาษาไทย')}
                {line('year', 'ปีที่เสร็จ ค.ศ. (จำเป็น)', 'เช่น 2026')}
                {line('slug', 'slug (ใช้ในลิงก์จากผลค้นหา)', 'เว้นว่างได้ ระบบสร้างจากชื่อภาษาอังกฤษ · ใช้ a-z ตัวเลข และ -')}
              </div>
              <div>
                <p className={label}>รูปผลงาน (จำเป็น รูปแรกแสดงก่อน)</p>
                <ImageField value={form.images} onChange={(images) => set({ images })} />
              </div>
              <fieldset>
                <legend className={label}>สินค้าที่ใช้ในผลงานนี้</legend>
                <input
                  type="search"
                  value={pq}
                  onChange={(e) => setPq(e.target.value)}
                  placeholder="ค้นหาสินค้า"
                  aria-label="ค้นหาสินค้าที่ใช้"
                  className={input}
                />
                <ul className="mt-2 max-h-64 overflow-y-auto rounded-xl bg-white/40 p-1">
                  {picks.map((p) => (
                    <li key={p.id}>
                      <label className="flex min-h-11 items-center gap-3 rounded-lg px-2 text-sm hover:bg-white/60">
                        <input
                          type="checkbox"
                          checked={form.products.includes(p.id)}
                          onChange={(e) =>
                            set({ products: e.target.checked ? [...form.products, p.id] : form.products.filter((x) => x !== p.id) })
                          }
                          className="h-4 w-4 shrink-0 accent-ink"
                        />
                        <span className="min-w-0 flex-1 truncate">{p.th}</span>
                        {!p.published && <span className="shrink-0 text-xs text-stone-600">ซ่อนอยู่</span>}
                      </label>
                    </li>
                  ))}
                </ul>
                <p className="mt-1.5 text-xs text-stone-600">เลือกแล้ว {form.products.length} รายการ · สินค้าที่ซ่อนอยู่ไม่แสดงบนหน้าเว็บ</p>
              </fieldset>
              <label className="flex min-h-11 items-center gap-3 text-sm">
                <input type="checkbox" checked={form.published} onChange={(e) => set({ published: e.target.checked })} className="h-4 w-4 accent-ink" />
                แสดงบนหน้าเว็บ
              </label>
            </div>
            <div className="space-y-2 border-t border-white/70 px-5 pt-3 md:border-0 md:px-6 md:pb-6" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
              <p role="alert" className={`min-h-5 text-sm ${danger}`}>
                {formError}
              </p>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <button type="button" className={`${ghost} hidden md:inline-flex`} onClick={() => setForm(null)}>
                  ยกเลิก
                </button>
                <button type="submit" className={`${solid} w-full justify-center md:w-auto`} disabled={busy}>
                  {busy ? 'กำลังบันทึก' : 'บันทึก'}
                </button>
              </div>
            </div>
          </form>
        )}
      </dialog>

      <dialog
        ref={delRef}
        onClose={() => setDel(null)}
        aria-labelledby="project-del-title"
        className="bottom-0 top-auto !m-0 w-full max-w-none bg-transparent p-0 text-ink backdrop:bg-ink/30 md:top-0 md:!m-auto md:w-[min(92vw,440px)]"
      >
        {/* มือถือ: sheet จากขอบล่าง ปุ่ม 2 ช่องเท่ากัน · ตั้งแต่ md: กล่องกลางจอ */}
        {del && (
          <div className="glass m-2 rounded-[28px] p-6 md:m-0" style={{ marginBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}>
            <h2 id="project-del-title" className="text-lg font-light">
              ลบ {del.th}
            </h2>
            <p className="mt-3 text-sm text-stone-600">ผลงานนี้จะหายจากหน้าเว็บ และกู้คืนไม่ได้ สินค้าที่ผูกไว้ไม่หาย ถ้าแค่ไม่อยากให้เห็น ใช้ปุ่มซ่อนแทน</p>
            <div className="mt-6 grid grid-cols-2 gap-2 md:flex md:justify-end">
              <button type="button" autoFocus className={`${ghost} justify-center bg-white/60 md:bg-transparent`} onClick={() => setDel(null)}>
                ยกเลิก
              </button>
              <button
                type="button"
                className={`${dangerSolid} justify-center`}
                disabled={busy}
                onClick={async () => {
                  const error = await run(() => deleteProjectAction(del.id), `ลบ ${del.th} แล้ว`);
                  if (error) setMsg(error);
                  setDel(null);
                }}
              >
                ลบ
              </button>
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}
```

- [ ] **Step 7: Typecheck and verify in the browser, deciding from the database**

```bash
npx tsc --noEmit 2>&1 | grep -v '\.next/types'
grep -rn "lib/projects'" app components
```
Expected: tsc prints nothing; grep prints only `components/CatalogProvider.tsx` (a `import type`).

Run Q0 and Q1. `PSQL="psql -h localhost -p 5433 -d iterra_dev -At"`.

1. `/projects/` shows the 6 seeded projects with their product links, same as before this task. Search "เขาใหญ่" in the site search: `/projects/#khao-yai-villa` is in the results. Screenshot.
2. `/admin/projects/` lists 6 projects. At 375 px the bottom bar shows สินค้า, บทความ, ผลงาน plus the person icon.
3. เพิ่มผลงาน: Thai name `QA ผลงานทดสอบ`, slug `qa-project-check`, year `2026`, upload `public/media/scenes/about-hero.webp`, tick the first 2 products in the product list, tick แสดงบนหน้าเว็บ, save. DB: `$PSQL -c "select count(*) from project_products pp join projects p on p.id = pp.project_id where p.slug = 'qa-project-check'"` prints `2`. `/projects/` shows the card last, with the 2 product names linked.
4. Year `26` then save: the form shows the year message; DB year still `2026`.
5. Press ซ่อน: `$PSQL -c "select published from projects where slug = 'qa-project-check'"` prints `f`; `/projects/` no longer shows it.
6. Delete it. DB: project count for that slug `0` and `$PSQL -c "select count(*) from project_products where project_id not in (select id from projects)"` prints `0`.
7. Audit for the QA user contains `create|project`, `unpublish|project`, `delete|project` (same query as Task 2 Step 8 item 7).
8. `list_console_messages` (errors only) prints nothing on `/projects/` and `/admin/projects/`.

Run Q2.

- [ ] **Step 8: Gates, commit and push**

```bash
npx tsc --noEmit 2>&1 | grep -v '\.next/types'
npm run check:db && npm run check:filter && npm run check:search
npm run build
npm run check:overflow
git add lib/server/projects.ts 'app/admin/(panel)/projects' components/admin/ProjectsAdmin.tsx components/admin/AdminShell.tsx components/CatalogProvider.tsx app/layout.tsx components/ProjectsContent.tsx components/SearchPanel.tsx scripts/check-db.mjs
npm run check:text
git commit -m "feat: manage projects and their products from the admin and read them from the database" && git push
```

---

### Task 4: Catalog PDF upload, admin screen and public page from the database

**Files:**
- Create: `lib/server/catalog.ts`, `app/api/catalog-pdf/route.ts`, `app/admin/(panel)/catalog/page.tsx`, `components/admin/CatalogAdmin.tsx`
- Modify: `components/admin/AdminShell.tsx`, `app/catalog/page.tsx`, `app/page.tsx`, `components/CatalogContent.tsx`, `components/CatalogViewer.tsx`, `components/CatalogTeaser.tsx`, `components/home/HomeContent.tsx`, `lib/i18n.ts`
- Test: `scripts/check-db.mjs`
- Not changed, on purpose: `next.config.mjs` (protected). The upload goes through a Route Handler outside `/admin`, so neither `serverActions.bodySizeLimit` (6 MB) nor `proxyClientMaxBodySize` (10 MB, applies only where `proxy.ts` runs, i.e. `/admin/:path*`) is in the way. Docs: `node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/proxyClientMaxBodySize.md` ("the body will only be buffered up to the limit ... The request will not fail"), `.../serverActions.md` (`bodySizeLimit`), `01-app/01-getting-started/15-route-handlers.md`, `01-app/03-api-reference/04-functions/cookies.md` (cookies are readable in Route Handlers).

**Interfaces:**
- Consumes: `currentAdmin()`, `inTx()` (Task 1), `audit()` (Task 1), `newName(ext)` and `type UploadResult` from `lib/server/uploads.ts`, `CATALOG.page(n)` / `CATALOG.thumb(n)` from `lib/catalog.ts` (static page images), icon `book` (Task 2).
- Produces:
  - in `lib/server/catalog.ts`: `type CatalogInfo = { pdf: string; pages: number; sizeMb: number; updated: string; images: boolean }`, `MAX_PDF`, `BUILT_PDF`, `isPdf(bytes): boolean`, `pdfPageCount(bytes): number`, `pdfSizeMb(byteLength): number`, `getCatalog(db): Promise<CatalogInfo | null>`, `saveCatalog(db, pdf, pages, sizeMb): Promise<void>`
  - `POST /api/catalog-pdf/` (multipart field `file`) answers `UploadResult` JSON with status 200, 400, 401, 403, 411 or 413
  - `HomeContent({ catalog })`, `CatalogTeaser({ catalog })`, `CatalogContent({ catalog })`, `CatalogViewer({ pages, pdf })`
  - i18n keys `catalog.openPdf`, `catalog.noPreview` (TH and EN)

- [ ] **Step 1: Write the failing test**

In `scripts/check-db.mjs`, replace
```js
import { migrate } from './db-migrate.mjs';
```
with
```js
import { migrate } from './db-migrate.mjs';
import { readFileSync } from 'node:fs';
import { CATALOG } from '../lib/catalog.ts';
import * as cat from '../lib/server/catalog.ts';
```

Replace
```js
  console.log('ผ่าน: ฐานข้อมูล');
```
with
```js
  // ── แคตตาล็อก PDF (แผน 2 Task 4) ──
  {
    const pdf = (s) => new Uint8Array(Buffer.from(s, 'latin1'));
    const two = pdf(
      '%PDF-1.4\n1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n2 0 obj << /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >> endobj\n' +
        '3 0 obj << /Type /Page /Parent 2 0 R >> endobj\n4 0 obj << /Type/Page/Parent 2 0 R >> endobj\n%%EOF\n',
    );
    assert.equal(cat.isPdf(two), true);
    assert.equal(cat.pdfPageCount(two), 2);
    // ไฟล์จริงที่หน้าเว็บใช้อยู่: 49 หน้า 18 MB (ปัดขึ้นแบบ du -m)
    const real = new Uint8Array(readFileSync('public/media/catalog/kohler-kitchens-2026.pdf'));
    assert.equal(cat.pdfPageCount(real), CATALOG.pages);
    assert.equal(cat.pdfSizeMb(real.length), CATALOG.pdfSizeMB);
    assert.equal(cat.pdfSizeMb(1), 1);
    // ชื่อ .pdf แต่ข้างในเป็นอย่างอื่น
    assert.equal(cat.isPdf(pdf('<!doctype html><script>alert(1)</script>')), false);
    assert.equal(cat.isPdf(pdf(' %PDF-1.4')), false);
    assert.equal(cat.isPdf(new Uint8Array(0)), false);
    // หาโครงหน้าไม่เจอ = 0 (ไม่ทราบ หน้าเว็บไม่แสดงจำนวนหน้า)
    assert.equal(cat.pdfPageCount(pdf('%PDF-1.7\n%%EOF\n')), 0);
    assert.equal(cat.MAX_PDF, 30 * 1024 * 1024);
    assert.equal(cat.BUILT_PDF, CATALOG.pdf, 'ภาพรายหน้าใน public/media/catalog สร้างจากไฟล์นี้');
    const info = async () => {
      const { updated: _u, ...x } = await cat.getCatalog(c);
      return x;
    };
    // seed: ไฟล์เดิม มีภาพรายหน้า
    assert.deepEqual(await info(), { pdf: CATALOG.pdf, pages: 49, sizeMb: 18, images: true });
    // เปลี่ยนไฟล์แล้ว ภาพรายหน้าชุดเดิมต้องไม่แสดง
    await cat.saveCatalog(c, '/uploads/2026/10/abc.pdf', 12, 3);
    assert.deepEqual(await info(), { pdf: '/uploads/2026/10/abc.pdf', pages: 12, sizeMb: 3, images: false });
    for (const bad of ['/etc/passwd', 'https://evil.example/x.pdf', '/uploads/../x.pdf', '/uploads/2026/10/a.webp', 'javascript:alert(1)']) {
      await assert.rejects(cat.saveCatalog(c, bad, 1, 1), { name: 'InputError' }, bad);
    }
    await assert.rejects(cat.saveCatalog(c, '/uploads/a.pdf', -1, 1), { name: 'InputError' });
    await assert.rejects(cat.saveCatalog(c, '/uploads/a.pdf', 1, 0), { name: 'InputError' });
    assert.equal((await info()).pdf, '/uploads/2026/10/abc.pdf', 'ข้อมูลผิดไม่แตะแถวเดิม');
    // กลับเป็นไฟล์เดิม: ภาพรายหน้ากลับมา
    await cat.saveCatalog(c, CATALOG.pdf, 49, 18);
    assert.equal((await info()).images, true);
  }
  console.log('ผ่าน: ฐานข้อมูล');
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm run check:db`
Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `lib/server/catalog.ts`.

- [ ] **Step 3: Write the data module**

Create `lib/server/catalog.ts`:

```ts
// แคตตาล็อก PDF (แถวเดียว id = 1): ตรวจไฟล์ นับหน้า และอ่านให้หน้าเว็บ
// import ไม่มี เพื่อให้ scripts/check-db.mjs รันไฟล์นี้ด้วย Node ได้ตรง ๆ

type Db = { query(text: string, values?: unknown[]): Promise<{ rows: any[]; rowCount: number | null }> };

export class InputError extends Error {
  name = 'InputError';
}

export type CatalogInfo = {
  pdf: string;
  pages: number; // 0 = นับจากไฟล์ไม่ได้
  sizeMb: number;
  updated: string; // YYYY-MM-DD HH:MM เวลาไทย
  images: boolean; // มีภาพรายหน้าที่ตรงกับไฟล์นี้หรือไม่
};

// spec หัวข้อ 5: PDF ไม่เกิน 30 MB · ครอบไฟล์ 18 MB ในเกณฑ์ประสิทธิภาพของ docs/pm/standards.md
export const MAX_PDF = 30 * 1024 * 1024;
// ภาพรายหน้าใน public/media/catalog สร้างจากไฟล์นี้ด้วย scripts/build-media.sh catalog (ต้องตรงกับ CATALOG.pdf ใน lib/catalog.ts)
// ไฟล์อื่นไม่มีภาพของตัวเอง เพราะไม่สร้างภาพบน server (spec หัวข้อ 10) หน้าเว็บจึงให้เปิด PDF ตรง
export const BUILT_PDF = '/media/catalog/kohler-kitchens-2026.pdf';

// ดูชนิดจากไบต์แรกของไฟล์ ไม่เชื่อนามสกุลหรือ type ที่เบราว์เซอร์ส่งมา
export function isPdf(b: Uint8Array): boolean {
  return b.length >= 5 && String.fromCharCode(...b.subarray(0, 5)) === '%PDF-';
}

// นับหน้าโดยไม่ใช้ dependency: นับ object /Type /Page กับอ่าน /Count ของ page tree แล้วเอาค่ามากสุด
// ponytail: PDF ที่เก็บ object ไว้ใน object stream แบบบีบอัด (PDF 1.5 ขึ้นไปบางไฟล์) หาไม่เจอทั้งคู่ ได้ 0 = ไม่ทราบ
// ถ้าต้องแม่นทุกไฟล์ ให้เพิ่มช่องกรอกจำนวนหน้าในหลังบ้าน หรือใช้ pdfinfo บน server
export function pdfPageCount(b: Uint8Array): number {
  const s = Buffer.from(b.buffer, b.byteOffset, b.byteLength).toString('latin1');
  const pages = (s.match(/\/Type\s*\/Page(?![A-Za-z])/g) ?? []).length;
  const counts = Array.from(s.matchAll(/\/Count\s+(\d+)/g), (m) => Number(m[1]));
  return Math.max(pages, 0, ...counts);
}

// MB ปัดขึ้นแบบ du -m (ไฟล์ 18,008,076 ไบต์ = 18 ตรงกับที่หน้าเว็บแสดงเดิม)
export const pdfSizeMb = (bytes: number) => Math.max(1, Math.ceil(bytes / 1048576));

export async function getCatalog(db: Db): Promise<CatalogInfo | null> {
  const r = await db.query(
    `select pdf, page_count, size_mb, to_char(updated_at at time zone 'Asia/Bangkok', 'YYYY-MM-DD HH24:MI') as updated
       from catalog where id = 1`,
  );
  const x = r.rows[0];
  return x ? { pdf: x.pdf, pages: x.page_count, sizeMb: x.size_mb, updated: x.updated, images: x.pdf === BUILT_PDF } : null;
}

export async function saveCatalog(db: Db, pdf: string, pages: number, sizeMb: number): Promise<void> {
  if (typeof pdf !== 'string' || !/^\/(media|uploads)\/[\w./-]+\.pdf$/.test(pdf) || pdf.includes('..')) {
    throw new InputError('ที่อยู่ไฟล์ PDF ไม่ถูกต้อง');
  }
  if (!Number.isInteger(pages) || pages < 0 || !Number.isInteger(sizeMb) || sizeMb < 1) throw new InputError('ข้อมูลไฟล์ไม่ถูกต้อง');
  await db.query(
    `insert into catalog (id, pdf, page_count, size_mb, updated_at) values (1, $1, $2, $3, now())
     on conflict (id) do update set pdf = excluded.pdf, page_count = excluded.page_count, size_mb = excluded.size_mb, updated_at = now()`,
    [pdf, pages, sizeMb],
  );
}
```

- [ ] **Step 4: Run the test and watch it pass**

Run: `npm run check:db`
Expected: `ผ่าน: ฐานข้อมูล`

- [ ] **Step 5: Write the upload Route Handler**

Create `app/api/catalog-pdf/route.ts`:

```ts
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { currentAdmin, inTx } from '@/lib/admin';
import { audit } from '@/lib/server/audit';
import { MAX_PDF, isPdf, pdfPageCount, pdfSizeMb, saveCatalog } from '@/lib/server/catalog';
import { newName, type UploadResult } from '@/lib/server/uploads';

// เปลี่ยนไฟล์แคตตาล็อก PDF (ไม่เกิน 30 MB) · ใช้ Route Handler แทน Server Function เพราะ
// 1) Server Function รับได้ไม่เกิน serverActions.bodySizeLimit 6 MB ใน next.config.mjs (ไฟล์ protected ไม่แก้)
// 2) proxy.ts ทำงานกับ /admin/* และพักข้อมูลได้แค่ 10 MB (proxyClientMaxBodySize) เกินนั้นตัดทิ้งเงียบ ๆ ไม่ error
// route นี้อยู่นอก /admin จึงไม่ผ่าน proxy และต้องตรวจ session เองทุกครั้ง
// บน server nginx ต้องตั้ง client_max_body_size 31m
const json = (r: UploadResult, status = 200) => Response.json(r, { status });

export async function POST(req: Request) {
  const admin = await currentAdmin();
  if (!admin) return json({ ok: false, error: 'กรุณาเข้าสู่ระบบใหม่' }, 401);
  // cookie เป็น SameSite=lax อยู่แล้ว ด่านนี้กันซ้ำ: เบราว์เซอร์บอกว่าคำขอมาจากเว็บอื่น = ไม่รับ
  const site = req.headers.get('sec-fetch-site');
  if (site && site !== 'same-origin') return json({ ok: false, error: 'ไม่รับคำขอจากเว็บอื่น' }, 403);
  // ดูขนาดจาก header ก่อนอ่านเนื้อ ไม่ให้ไฟล์ใหญ่เข้าหน่วยความจำ · เผื่อส่วนหัว multipart 64 KB
  const length = Number(req.headers.get('content-length'));
  if (!length) return json({ ok: false, error: 'ไม่พบไฟล์' }, 411);
  if (length > MAX_PDF + 64 * 1024) return json({ ok: false, error: 'ไฟล์ใหญ่เกิน 30 MB' }, 413);
  const root = process.env.UPLOAD_DIR;
  if (!root) throw new Error('ยังไม่ได้ตั้ง UPLOAD_DIR ใน .env');
  const file = (await req.formData()).get('file');
  if (!(file instanceof File) || file.size === 0) return json({ ok: false, error: 'ไม่พบไฟล์' }, 400);
  if (file.size > MAX_PDF) return json({ ok: false, error: 'ไฟล์ใหญ่เกิน 30 MB' }, 413);
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!isPdf(bytes)) return json({ ok: false, error: 'รับเฉพาะไฟล์ PDF' }, 400);
  const name = newName('pdf');
  const full = path.join(root, name);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, bytes);
  const url = `/uploads/${name}`;
  const pages = pdfPageCount(bytes);
  const sizeMb = pdfSizeMb(bytes.length);
  // ponytail: ไฟล์เก่าไม่ลบ (การลบข้อมูลต้องได้อนุมัติ) ถ้าดิสก์เริ่มเต็มค่อยทำสคริปต์ล้างไฟล์ที่ไม่มีแถวไหนอ้าง
  await inTx(async (tx) => {
    await saveCatalog(tx, url, pages, sizeMb);
    await audit(tx, admin.id, 'replace', 'catalog', 1, { pdf: url, pages, sizeMb });
  });
  return json({ ok: true, url });
}
```

- [ ] **Step 6: Public pages read the catalog row**

In `lib/i18n.ts`, replace (Thai block)
```ts
      next: 'หน้าถัดไป',
```
with
```ts
      next: 'หน้าถัดไป',
      openPdf: 'เปิดดู PDF',
      noPreview: 'ฉบับนี้ยังไม่มีภาพตัวอย่างรายหน้า เปิดดูจากไฟล์ PDF ได้เลย',
```
and replace (English block)
```ts
      next: 'Next page',
```
with
```ts
      next: 'Next page',
      openPdf: 'Open the PDF',
      noPreview: 'This edition has no page previews yet. Open the PDF to read it.',
```

Replace the whole of `app/catalog/page.tsx` with:

```tsx
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import CatalogContent from '@/components/CatalogContent';
import { db } from '@/lib/db';
import { getCatalog } from '@/lib/server/catalog';

// metadata กับหน้าใช้ query เดียวกันใน request เดียว
const load = cache(() => getCatalog(db));

export async function generateMetadata(): Promise<Metadata> {
  const c = await load();
  return {
    title: 'แคตตาล็อก KOHLER Kitchens 2026',
    description: `เปิดดูและดาวน์โหลดแคตตาล็อกครัวและตู้เสื้อผ้า KOHLER Kitchens 2026 ฉบับเต็ม${c && c.pages > 0 ? ` ${c.pages} หน้า` : ''}`,
    alternates: { canonical: '/catalog/' },
  };
}

export default async function CatalogPage() {
  const catalog = await load();
  if (!catalog) notFound();
  return <CatalogContent catalog={catalog} />;
}
```

Replace the whole of `components/CatalogContent.tsx` with:

```tsx
'use client';

// หน้าแคตตาล็อก: หัวเรื่อง ปุ่มดาวน์โหลด และ grid ทุกหน้า · ข้อมูลไฟล์มาจาก DB (แก้ที่ /admin/catalog/)
// ภาพรายหน้าสร้างจาก PDF ชุดเดิมด้วย scripts/build-media.sh · เปลี่ยน PDF แล้วภาพชุดนี้ไม่ตรง จึงให้เปิด PDF ตรงแทน (spec หัวข้อ 10)

import Reveal from './Reveal';
import CatalogViewer from './CatalogViewer';
import { useLang } from './LangProvider';
import type { CatalogInfo } from '@/lib/server/catalog';

const button =
  'inline-block shrink-0 border border-ink px-9 py-3.5 text-[11px] uppercase tracking-widest2 transition-colors duration-300 hover:bg-ink hover:text-paper';

export default function CatalogContent({ catalog }: { catalog: CatalogInfo }) {
  const { t } = useLang();
  return (
    <section className="px-6 pb-28 pt-36 md:px-[8vw] md:pt-44">
      <Reveal className="mb-14 flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-4 text-[11px] uppercase tracking-widest2 text-warm-500">{t.catalog.kicker}</p>
          <h1 className="text-4xl font-extralight tracking-wide md:text-5xl">{t.catalog.title}</h1>
          <p className="mt-4 max-w-lg text-sm font-light leading-relaxed text-warm-500">{t.catalog.sub}</p>
        </div>
        <a href={catalog.pdf} download className={button}>
          {t.catalog.download} · {catalog.sizeMb} MB
        </a>
      </Reveal>
      {catalog.images ? (
        <CatalogViewer pages={catalog.pages} pdf={catalog.pdf} />
      ) : (
        <Reveal>
          <p className="max-w-lg text-sm font-light leading-relaxed text-warm-500">{t.catalog.noPreview}</p>
          <a href={catalog.pdf} target="_blank" rel="noopener" className={`${button} mt-8`}>
            {t.catalog.openPdf}
          </a>
        </Reveal>
      )}
    </section>
  );
}
```

In `components/CatalogViewer.tsx`, run
```bash
sed -i '' -e 's/CATALOG\.pages/total/g' -e 's/CATALOG\.pdf/pdf/g' components/CatalogViewer.tsx
grep -c 'CATALOG\.' components/CatalogViewer.tsx
```
Expected: `2` (only `CATALOG.thumb(n)` and `CATALOG.page(open)` remain; the page images keep their static paths). Then replace
```tsx
export default function CatalogViewer() {
```
with
```tsx
// pages = จำนวนหน้าจาก DB · pdf = ไฟล์ปัจจุบัน · แสดงเฉพาะเมื่อภาพรายหน้าตรงกับไฟล์ (CatalogContent ตัดสิน)
export default function CatalogViewer({ pages: total, pdf }: { pages: number; pdf: string }) {
```
and replace
```tsx
    (d: number) => setOpen((n) => (n === null ? n : Math.min(total, Math.max(1, n + d)))),
    [],
```
with
```tsx
    (d: number) => setOpen((n) => (n === null ? n : Math.min(total, Math.max(1, n + d)))),
    [total],
```

Replace the whole of `components/CatalogTeaser.tsx` with:

```tsx
'use client';

// หน้าแรก: แถบชวนเปิดแคตตาล็อก ปกขยายเล็กน้อยตอน hover กับปุ่มเปิดดูและดาวน์โหลด
// ปกคือภาพหน้า 1 ที่สร้างจาก PDF ชุดเดิม · เปลี่ยน PDF แล้วไม่มีภาพของฉบับใหม่ จึงซ่อนปก (catalog.images)

import Link from 'next/link';
import Reveal from './Reveal';
import { useLang } from './LangProvider';
import { CATALOG } from '@/lib/catalog';
import type { CatalogInfo } from '@/lib/server/catalog';

export default function CatalogTeaser({ catalog }: { catalog: CatalogInfo | null }) {
  const { t } = useLang();
  if (!catalog) return null;
  return (
    <section
      className={`grid items-center gap-12 px-6 py-24 md:px-[8vw] md:py-32 ${catalog.images ? 'md:grid-cols-[1.3fr_1fr]' : ''}`}
    >
      {catalog.images && (
        <Reveal>
          <Link href="/catalog/" className="group block overflow-hidden">
            <img
              src={CATALOG.page(1)}
              alt={t.catalog.title}
              loading="lazy"
              className="aspect-[1.414/1] w-full object-cover transition-transform duration-1000 ease-out group-hover:scale-[1.03]"
            />
          </Link>
        </Reveal>
      )}
      <Reveal delay={0.12}>
        <p className="mb-4 text-[11px] uppercase tracking-widest2 text-warm-500">{t.catalog.kicker}</p>
        <h2 className="text-3xl font-extralight tracking-wide md:text-4xl">{t.catalog.title}</h2>
        <p className="mt-4 max-w-sm text-sm font-light leading-relaxed text-warm-500">{t.catalog.sub}</p>
        <div className="mt-10 flex flex-wrap gap-4">
          <Link
            href="/catalog/"
            className="inline-block border border-ink px-9 py-3.5 text-[11px] uppercase tracking-widest2 transition-colors duration-300 hover:bg-ink hover:text-paper"
          >
            {t.catalog.open}
          </Link>
          <a
            href={catalog.pdf}
            download
            className="inline-block px-2 py-3.5 text-[11px] uppercase tracking-widest2 text-warm-500 underline-offset-8 hover:text-ink hover:underline"
          >
            {t.catalog.download}
          </a>
        </div>
      </Reveal>
    </section>
  );
}
```

In `components/home/HomeContent.tsx`, replace
```tsx
import { useCatalog } from '@/components/CatalogProvider';
```
with
```tsx
import { useCatalog } from '@/components/CatalogProvider';
import type { CatalogInfo } from '@/lib/server/catalog';
```
replace
```tsx
export default function HomeContent() {
```
with
```tsx
export default function HomeContent({ catalog }: { catalog: CatalogInfo | null }) {
```
and replace
```tsx
      <CatalogTeaser />
```
with
```tsx
      <CatalogTeaser catalog={catalog} />
```

In `app/page.tsx`, replace
```tsx
import { SITE_TAGLINE_TH, SITE_TAGLINE_EN } from '@/lib/site';
```
with
```tsx
import { SITE_TAGLINE_TH, SITE_TAGLINE_EN } from '@/lib/site';
import { db } from '@/lib/db';
import { getCatalog } from '@/lib/server/catalog';
```
and replace
```tsx
export default function HomePage() {
  return <HomeContent />;
}
```
with
```tsx
export default async function HomePage() {
  return <HomeContent catalog={await getCatalog(db)} />;
}
```

- [ ] **Step 7: Admin page, menu and screen**

Create `app/admin/(panel)/catalog/page.tsx`:

```tsx
import type { Metadata } from 'next';
import CatalogAdmin from '@/components/admin/CatalogAdmin';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/admin';
import { getCatalog } from '@/lib/server/catalog';

export const metadata: Metadata = { title: 'แคตตาล็อก' };

export default async function AdminCatalogPage() {
  await requireAdmin();
  return <CatalogAdmin catalog={await getCatalog(db)} />;
}
```

In `components/admin/AdminShell.tsx`, replace
```tsx
  { href: '/admin/announcement/', label: 'ประกาศ', icon: 'megaphone' },
];
```
with
```tsx
  { href: '/admin/announcement/', label: 'ประกาศ', icon: 'megaphone' },
  { href: '/admin/catalog/', label: 'แคตตาล็อก', icon: 'book' },
];
```

Create `components/admin/CatalogAdmin.tsx`:

```tsx
'use client';

// หลังบ้าน: แคตตาล็อก PDF · อัปโหลดผ่าน POST /api/catalog-pdf/ (Route Handler) เพราะไฟล์ใหญ่เกินเพดานของ Server Function
// ไฟล์ใหม่แทนไฟล์เดิมทันที · ไฟล์ที่ไม่ใช่ชุดเดิมไม่มีภาพรายหน้า หน้าเว็บจึงให้เปิด PDF ตรง
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { CatalogInfo } from '@/lib/server/catalog';
import type { UploadResult } from '@/lib/server/uploads';
import { danger } from './ui';

// ตรงกับ MAX_PDF ใน lib/server/catalog.ts (ไม่ import ไฟล์นั้นเข้า bundle ฝั่ง client)
const MAX = 30 * 1024 * 1024;

export default function CatalogAdmin({ catalog }: { catalog: CatalogInfo | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setMsg('');
    if (file.size > MAX) return setError('ไฟล์ใหญ่เกิน 30 MB');
    setBusy(true);
    setError('');
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await fetch('/api/catalog-pdf/', { method: 'POST', body: fd });
      const r = (await res.json()) as UploadResult;
      if (!r.ok) return setError(r.error);
      setMsg('เปลี่ยนแคตตาล็อกแล้ว หน้าเว็บใช้ไฟล์ใหม่ทันที');
      router.refresh();
    } catch {
      setError('อัปโหลดไม่สำเร็จ ลองใหม่อีกครั้ง');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <header className="glass rounded-[28px] p-5 md:p-6">
        <h1 className="text-2xl font-extralight tracking-wide md:text-3xl">แคตตาล็อก</h1>
        <p className="mt-1 text-sm text-stone-600">ไฟล์ PDF ที่หน้าเว็บให้เปิดดูและดาวน์โหลด</p>
      </header>
      <section className="glass space-y-5 rounded-[28px] p-5 md:p-6">
        <h2 className="text-xl font-light">ไฟล์ปัจจุบัน</h2>
        {catalog ? (
          <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[auto_minmax(0,1fr)]">
            <dt className="text-stone-600">ไฟล์</dt>
            <dd className="min-w-0 break-all">
              <a href={catalog.pdf} target="_blank" rel="noopener" className="underline underline-offset-4">
                {catalog.pdf}
              </a>
            </dd>
            <dt className="text-stone-600">จำนวนหน้า</dt>
            <dd>{catalog.pages > 0 ? `${catalog.pages} หน้า` : 'นับจากไฟล์ไม่ได้ หน้าเว็บจึงไม่แสดงจำนวนหน้า'}</dd>
            <dt className="text-stone-600">ขนาด</dt>
            <dd>{catalog.sizeMb} MB</dd>
            <dt className="text-stone-600">เปลี่ยนล่าสุด</dt>
            <dd>{catalog.updated}</dd>
            <dt className="text-stone-600">ภาพตัวอย่างรายหน้า</dt>
            <dd>{catalog.images ? 'มี (ชุดที่สร้างจากไฟล์นี้)' : 'ไม่มี หน้าเว็บให้เปิด PDF ตรง'}</dd>
          </dl>
        ) : (
          <p className="text-sm">ยังไม่มีแคตตาล็อก</p>
        )}
        <label className="block cursor-pointer rounded-2xl border border-dashed border-warm-500 bg-white/40 px-6 py-6 text-center text-sm transition focus-within:border-ink hover:border-ink">
          {busy ? 'กำลังอัปโหลด อาจใช้เวลาสักครู่' : 'กดเพื่อเลือกไฟล์ PDF ใหม่'}
          <span className="mt-1 block text-xs text-stone-600">PDF ไม่เกิน 30 MB · ไฟล์ใหม่แทนไฟล์เดิมทันที</span>
          <input type="file" accept="application/pdf" className="sr-only" disabled={busy} onChange={pick} />
        </label>
        <p role="alert" className={`min-h-5 text-sm ${danger}`}>
          {error}
        </p>
        <p role="status" className="min-h-5 text-sm">
          {msg}
        </p>
      </section>
    </>
  );
}
```

- [ ] **Step 8: Typecheck**

```bash
npx tsc --noEmit 2>&1 | grep -v '\.next/types'
grep -rn "CATALOG\." components app | grep -v 'CATALOG\.page(\|CATALOG\.thumb('
```
Expected: tsc prints nothing; grep prints nothing (only the static page image helpers are still used).

- [ ] **Step 9: Verify in the browser, deciding from the database and the disk**

Run Q0 and Q1. `PSQL="psql -h localhost -p 5433 -d iterra_dev -At"`, `UP=$(grep '^UPLOAD_DIR=' .env | cut -d= -f2)`.

1. Before uploading: `/catalog/` shows the 49 page grid and `ดาวน์โหลด PDF · 18 MB`; `/` shows the teaser with the cover image. `/admin/catalog/` shows 49 หน้า, 18 MB, ภาพตัวอย่างรายหน้า มี. Screenshot.
2. No session: `curl -s -o /dev/null -w '%{http_code}\n' -F file=@public/media/catalog/kohler-kitchens-2026.pdf http://localhost:4100/api/catalog-pdf/` prints `401`; `$PSQL -c "select pdf from catalog"` still prints `/media/catalog/kohler-kitchens-2026.pdf`.
3. Fake PDF: `printf '<!doctype html><script>alert(1)</script>' > "$SCRATCH/fake.pdf"`, upload it on `/admin/catalog/` (`upload_file`). The page shows `รับเฉพาะไฟล์ PDF`; the catalog row is unchanged.
4. Too big, checked by the server (the client check is skipped on purpose): on `/admin/catalog/` run with `evaluate_script`:
   `async () => { const fd = new FormData(); fd.append('file', new File([new Uint8Array(31 * 1024 * 1024)], 'big.pdf')); return (await fetch('/api/catalog-pdf/', { method: 'POST', body: fd })).status; }`
   Expected `413`; the catalog row is unchanged.
5. The 18 MB requirement: upload `public/media/catalog/kohler-kitchens-2026.pdf` (absolute path) on `/admin/catalog/`. Wait for `เปลี่ยนแคตตาล็อกแล้ว`. DB: `$PSQL -c "select pdf like '/uploads/%.pdf', page_count, size_mb from catalog"` prints `t|49|18`. Disk: `stat -f %z "$UP/$($PSQL -c "select substr(pdf, 10) from catalog")"` prints `18008076` (nothing was truncated by a buffer).
6. Stale images gone: `/catalog/` now shows `ฉบับนี้ยังไม่มีภาพตัวอย่างรายหน้า ...` and `เปิดดู PDF`, no page grid (`evaluate_script`: `document.querySelectorAll('img[src*="/media/catalog/"]').length` gives `0`). The download link points to the new `/uploads/...pdf` and `curl -s -o /dev/null -w '%{http_code} %{content_type}\n' http://localhost:4100$($PSQL -c "select pdf from catalog")` prints `200 application/pdf`. `/` shows the teaser without the cover image. Switch the site to English: the message and button are in English.
7. Audit: `$PSQL -c "select action, entity, detail->>'pages' from audit_log order by id desc limit 1"` prints `replace|catalog|49`.
8. Restore the seed row: `$PSQL -c "update catalog set pdf = '/media/catalog/kohler-kitchens-2026.pdf', page_count = 49, size_mb = 18, updated_at = now() where id = 1"`; `/catalog/` shows the 49 page grid again.
9. `list_console_messages` (errors only) prints nothing on `/catalog/`, `/` and `/admin/catalog/`.

Clean up: `rm -f "$SCRATCH/fake.pdf"`, then run Q2 (it deletes the uploaded PDF, found through the `replace` audit row).

- [ ] **Step 10: Gates, commit and push**

```bash
npx tsc --noEmit 2>&1 | grep -v '\.next/types'
npm run check:db && npm run check:filter && npm run check:search
npm run build
npm run check:overflow
git add lib/server/catalog.ts app/api/catalog-pdf/route.ts 'app/admin/(panel)/catalog' components/admin/CatalogAdmin.tsx components/admin/AdminShell.tsx app/catalog/page.tsx app/page.tsx components/CatalogContent.tsx components/CatalogViewer.tsx components/CatalogTeaser.tsx components/home/HomeContent.tsx lib/i18n.ts scripts/check-db.mjs
npm run check:text
git commit -m "feat: replace the catalog pdf from the admin and read the catalog from the database" && git push
```

---

### Task 5: Contact form into the database, with an admin inbox

**Files:**
- Create: `lib/server/inquiries.ts`, `app/contact/actions.ts`, `app/admin/(panel)/inquiries/page.tsx`, `app/admin/(panel)/inquiries/actions.ts`, `components/admin/InquiriesAdmin.tsx`
- Modify: `components/ContactContent.tsx`, `lib/i18n.ts`, `components/admin/AdminShell.tsx`
- Test: `scripts/check-db.mjs`

**Interfaces:**
- Consumes: `ipHash()`, `adminAction`, `audit` (Task 1); the existing `inquiries` table and its `(ip_hash, created_at)` index (Plan 1 `001_init.sql`); icon `mail` (Task 2).
- Produces:
  - in `lib/server/inquiries.ts`: `type InquiryInput = { name: unknown; email: unknown; message: unknown; website?: unknown }`, `type InquiryError = 'name' | 'email' | 'message' | 'chars' | 'limit'`, `type AdminInquiry = { id; name; email; message; created: string; handled: boolean }`, `submitInquiry(db, input, ipHash): Promise<InquiryError | null>`, `listInquiries(db)`, `markHandled(db, id)`
  - public Server Function `submitInquiryAction(input): Promise<{ ok: true } | { ok: false; error: InquiryError | 'server' }>`
  - i18n keys `contact.sending`, `contact.errors.{name,email,message,chars,limit,server}`; `contact.toast` no longer says demo
- Not in this task: sending email (SMTP later, `emailed_at` stays null). Note for the lead: per `docs/pm/standards.md` section 3, the privacy policy must pass legal review before this form collects real data on production.

- [ ] **Step 1: Write the failing test**

In `scripts/check-db.mjs`, replace
```js
import { migrate } from './db-migrate.mjs';
```
with
```js
import { migrate } from './db-migrate.mjs';
import * as inq from '../lib/server/inquiries.ts';
```

Replace
```js
  console.log('ผ่าน: ฐานข้อมูล');
```
with
```js
  // ── ฟอร์มติดต่อ (แผน 2 Task 5) ──
  {
    const ok = { name: 'คุณทดสอบ', email: 'buyer@example.test', message: 'สนใจซิงก์ 90 ซม.', website: '' };
    assert.equal(await inq.submitInquiry(c, ok, 'ip-q'), null);
    assert.deepEqual(
      (await c.query('select name, email, message, ip_hash, emailed_at, handled_at from inquiries order by id desc limit 1')).rows[0],
      { name: 'คุณทดสอบ', email: 'buyer@example.test', message: 'สนใจซิงก์ 90 ซม.', ip_hash: 'ip-q', emailed_at: null, handled_at: null },
    );
    // ช่องบนหน้าเว็บคือ อีเมลหรือเบอร์โทร: เบอร์โทรผ่าน
    assert.equal(await inq.submitInquiry(c, { ...ok, email: '081-234 5678' }, 'ip-q2'), null);
    assert.equal(await inq.submitInquiry(c, { ...ok, email: '+66 81 234 5678' }, 'ip-q2'), null);
    const stored = await count('inquiries');
    // ช่องดักบอทมีค่า: ตอบเหมือนสำเร็จ แต่ไม่เก็บ
    assert.equal(await inq.submitInquiry(c, { ...ok, website: 'http://spam.example' }, 'ip-q3'), null);
    // ข้อมูลผิด: ได้รหัสข้อผิด และไม่เก็บ
    assert.equal(await inq.submitInquiry(c, { ...ok, name: '  ' }, 'ip-q3'), 'name');
    assert.equal(await inq.submitInquiry(c, { ...ok, name: 'ก'.repeat(101) }, 'ip-q3'), 'name');
    assert.equal(await inq.submitInquiry(c, { ...ok, email: 'not-an-email' }, 'ip-q3'), 'email');
    assert.equal(await inq.submitInquiry(c, { ...ok, email: '12345' }, 'ip-q3'), 'email');
    assert.equal(await inq.submitInquiry(c, { ...ok, email: '' }, 'ip-q3'), 'email');
    assert.equal(await inq.submitInquiry(c, { ...ok, message: '' }, 'ip-q3'), 'message');
    assert.equal(await inq.submitInquiry(c, { ...ok, message: 'ก'.repeat(2001) }, 'ip-q3'), 'message');
    assert.equal(await inq.submitInquiry(c, { ...ok, name: '<b>x</b>' }, 'ip-q3'), 'chars');
    assert.equal(await inq.submitInquiry(c, { ...ok, message: 'hi <script>alert(1)</script>' }, 'ip-q3'), 'chars');
    assert.equal(await inq.submitInquiry(c, { name: 1, email: null, message: {} }, 'ip-q3'), 'name');
    assert.equal(await count('inquiries'), stored);
    // 3 ข้อความต่อ IP ใน 10 นาที · IP อื่นยังส่งได้ · พ้น 10 นาทีส่งได้อีก
    for (let i = 0; i < 3; i++) assert.equal(await inq.submitInquiry(c, ok, 'ip-r'), null);
    assert.equal(await inq.submitInquiry(c, ok, 'ip-r'), 'limit');
    assert.equal(await inq.submitInquiry(c, ok, 'ip-s'), null);
    await c.query("update inquiries set created_at = now() - interval '11 minutes' where ip_hash = 'ip-r'");
    assert.equal(await inq.submitInquiry(c, ok, 'ip-r'), null);
    // กล่องข้อความหลังบ้าน: ใหม่สุดก่อน ไม่ส่ง ip_hash ไปหน้าจอ · ทำเครื่องหมายจัดการแล้ว
    const list = await inq.listInquiries(c);
    assert.equal(list.length, await count('inquiries'));
    assert.deepEqual(Object.keys(list[0]).sort(), ['created', 'email', 'handled', 'id', 'message', 'name']);
    assert.ok(list.every((x, i) => i === 0 || list[i - 1].created >= x.created), 'ใหม่สุดก่อน');
    assert.equal(list[0].handled, false);
    await inq.markHandled(c, list[0].id);
    assert.equal((await inq.listInquiries(c)).find((x) => x.id === list[0].id).handled, true);
    await inq.markHandled(c, list[0].id);
    await assert.rejects(inq.markHandled(c, 999999), /ไม่พบข้อความนี้/);
    await assert.rejects(inq.markHandled(c, 'x'), /ไม่พบข้อความนี้/);
  }
  console.log('ผ่าน: ฐานข้อมูล');
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm run check:db`
Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `lib/server/inquiries.ts`.

- [ ] **Step 3: Write the data module**

Create `lib/server/inquiries.ts`:

```ts
// ข้อความจากฟอร์มติดต่อ: รับจากหน้าเว็บ (ไม่ต้องเข้าสู่ระบบ) และอ่านในหลังบ้าน
// import ไม่มี เพื่อให้ scripts/check-db.mjs รันไฟล์นี้ด้วย Node ได้ตรง ๆ
// ยังไม่ส่งอีเมล (SMTP ทำรอบถัดไป) emailed_at จึงเป็น null · ไม่มีอะไรลบแถวในตารางนี้ รอฝ่ายกฎหมายกำหนดระยะเก็บ
// ก่อนฟอร์มเก็บข้อมูลจริงบน production นโยบายความเป็นส่วนตัวต้องผ่านการตรวจทางกฎหมาย (docs/pm/standards.md หมวด 3)

type Db = { query(text: string, values?: unknown[]): Promise<{ rows: any[]; rowCount: number | null }> };

export class InputError extends Error {
  name = 'InputError';
}

// ทุกช่องมาจากเบราว์เซอร์ จึงเป็น unknown จนกว่าจะตรวจ
export type InquiryInput = { name: unknown; email: unknown; message: unknown; website?: unknown };
// หน้าเว็บแปลรหัสเป็นข้อความไทยหรืออังกฤษเอง (t.contact.errors ใน lib/i18n.ts)
export type InquiryError = 'name' | 'email' | 'message' | 'chars' | 'limit';
export type AdminInquiry = { id: number; name: string; email: string; message: string; created: string; handled: boolean };

const LIMIT = 3;
const WINDOW_MIN = 10;
const EMAIL = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
// ช่องเดิมบนหน้าเว็บคือ "อีเมลหรือเบอร์โทร" จึงรับเบอร์โทรด้วย: ตัวเลข 9 ถึง 15 หลัก คั่นด้วยช่องว่างหรือ - ได้ ขึ้นต้น + ได้
const PHONE = /^\+?[0-9][0-9 -]{7,20}$/;
const digits = (s: string) => s.replace(/\D/g, '').length;
const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

// คืน null = รับแล้ว (หรือเป็นบอทที่ตอบเหมือนรับ) · คืนรหัส = ไม่เก็บ
export async function submitInquiry(db: Db, input: InquiryInput, ipHash: string): Promise<InquiryError | null> {
  // บอทกรอกช่องที่คนมองไม่เห็น: ตอบเหมือนสำเร็จ ไม่บอกว่าโดนจับ และไม่เก็บ
  if (str(input.website)) return null;
  const name = str(input.name);
  const email = str(input.email);
  const message = str(input.message);
  if (/[<>]/.test(name + email + message)) return 'chars';
  if (!name || name.length > 100) return 'name';
  const phone = PHONE.test(email) && digits(email) >= 9 && digits(email) <= 15;
  if (email.length > 200 || !(EMAIL.test(email) || phone)) return 'email';
  if (!message || message.length > 2000) return 'message';
  // ponytail: นับแล้วค่อยเขียน คำขอที่มาพร้อมกันหลายอันอาจเกิน 3 ได้เล็กน้อย พอสำหรับกันสแปมรายเครื่อง
  const n = await db.query(
    'select count(*)::int as n from inquiries where ip_hash = $1 and created_at > now() - make_interval(mins => $2)',
    [ipHash, WINDOW_MIN],
  );
  if (n.rows[0].n >= LIMIT) return 'limit';
  await db.query('insert into inquiries (name, email, message, ip_hash) values ($1, $2, $3, $4)', [name, email, message, ipHash]);
  return null;
}

// ponytail: โหลดทุกข้อความในครั้งเดียว พอสำหรับหลักร้อย ถ้าเกินหลักพันค่อยแบ่งหน้า
export async function listInquiries(db: Db): Promise<AdminInquiry[]> {
  const r = await db.query(
    `select id::int as id, name, email, message, handled_at is not null as handled,
            to_char(created_at at time zone 'Asia/Bangkok', 'YYYY-MM-DD HH24:MI') as created
       from inquiries order by created_at desc, id desc`,
  );
  return r.rows;
}

// ทำซ้ำได้ เวลาที่จัดการครั้งแรกไม่เปลี่ยน
export async function markHandled(db: Db, id: number): Promise<void> {
  if (!Number.isInteger(id)) throw new InputError('ไม่พบข้อความนี้');
  const r = await db.query('update inquiries set handled_at = coalesce(handled_at, now()) where id = $1', [id]);
  if (r.rowCount === 0) throw new InputError('ไม่พบข้อความนี้');
}
```

- [ ] **Step 4: Run the test and watch it pass**

Run: `npm run check:db`
Expected: `ผ่าน: ฐานข้อมูล`

- [ ] **Step 5: Public Server Function, texts and the contact page**

Create `app/contact/actions.ts`:

```ts
'use server';

import { db } from '@/lib/db';
import { ipHash } from '@/lib/admin';
import { submitInquiry, type InquiryError, type InquiryInput } from '@/lib/server/inquiries';

// ฟอร์มติดต่อบนหน้าเว็บ: ไม่ต้องเข้าสู่ระบบ · Next เทียบ Origin กับ Host ให้แล้ว (docs 02-guides/server-actions.md หัวข้อ Security)
// คืนรหัสข้อผิด ให้หน้าเว็บแปลตามภาษาเอง · DB ล่มตอบ server ไม่โยน error ใส่ผู้ชม
export async function submitInquiryAction(input: InquiryInput): Promise<{ ok: true } | { ok: false; error: InquiryError | 'server' }> {
  try {
    const error = await submitInquiry(db, input, await ipHash());
    return error ? { ok: false, error } : { ok: true };
  } catch (e) {
    console.error('submitInquiry', e);
    return { ok: false, error: 'server' };
  }
}
```

In `lib/i18n.ts`, replace (Thai block)
```ts
      send: 'ส่งข้อความ',
      toast: 'ส่งข้อความเรียบร้อย เราจะติดต่อกลับภายใน 24 ชม. (เดโม่ — ยังไม่เชื่อมระบบจริง)',
```
with
```ts
      send: 'ส่งข้อความ',
      sending: 'กำลังส่ง',
      toast: 'ส่งข้อความเรียบร้อย เราจะติดต่อกลับภายใน 24 ชม.',
      errors: {
        name: 'กรุณากรอกชื่อ ไม่เกิน 100 ตัวอักษร',
        email: 'กรุณากรอกอีเมลหรือเบอร์โทรให้ถูกต้อง',
        message: 'กรุณากรอกข้อความ ไม่เกิน 2,000 ตัวอักษร',
        chars: 'ห้ามใช้เครื่องหมาย < หรือ >',
        limit: 'ส่งหลายครั้งเกินไป ลองใหม่อีกครั้งในอีก 10 นาที',
        server: 'ส่งไม่สำเร็จ ลองใหม่อีกครั้ง หรือโทรหาเรา',
      },
```
and replace (English block)
```ts
      send: 'Send message',
      toast: 'Message sent — we will get back to you within 24 hours. (Demo only)',
```
with
```ts
      send: 'Send message',
      sending: 'Sending',
      toast: 'Message sent. We will get back to you within 24 hours.',
      errors: {
        name: 'Please enter your name, up to 100 characters',
        email: 'Please enter a valid email or phone number',
        message: 'Please enter a message of up to 2,000 characters',
        chars: 'Please do not use < or >',
        limit: 'Too many messages. Please try again in 10 minutes',
        server: 'Could not send. Please try again, or call us',
      },
```

Replace the whole of `components/ContactContent.tsx` with:

```tsx
'use client';

// หน้าติดต่อ: ฟอร์มส่งเข้า DB ผ่าน submitInquiryAction (app/contact/actions.ts) · ยังไม่ส่งอีเมล ผู้ดูแลอ่านที่ /admin/inquiries/
// ช่อง website ซ่อนไว้ดักบอท · ตรวจข้อมูลจริงที่ฝั่ง server แล้วแปลรหัสข้อผิดตามภาษาจาก lib/i18n.ts
// + แผนที่ placeholder (ของจริงฝัง Google Maps embed ตรงนี้)

import { useEffect, useRef, useState } from 'react';
import Placeholder from './Placeholder';
import Reveal from './Reveal';
import { useLang } from './LangProvider';
import { CONTACT } from '@/lib/site';
import { submitInquiryAction } from '@/app/contact/actions';
import type { InquiryError } from '@/lib/server/inquiries';

const field = 'w-full border-b border-warm-300 bg-transparent py-3 text-sm font-light outline-none transition-colors focus:border-ink';
const caption = 'mb-2 block text-[11px] uppercase tracking-widest2 text-warm-500';

export default function ContactContent() {
  const { lang, t } = useLang();
  const [toast, setToast] = useState(false);
  const [error, setError] = useState<InquiryError | 'server' | ''>('');
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // เคลียร์ timer ของ toast ตอน unmount
  useEffect(() => () => clearTimeout(timer.current), []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setBusy(true);
    setError('');
    let r: Awaited<ReturnType<typeof submitInquiryAction>>;
    try {
      r = await submitInquiryAction({
        name: fd.get('name'),
        email: fd.get('email'),
        message: fd.get('message'),
        website: fd.get('website'),
      });
    } catch {
      r = { ok: false, error: 'server' };
    } finally {
      setBusy(false);
    }
    if (!r.ok) return setError(r.error);
    form.reset();
    setToast(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(false), 4200);
  };

  return (
    <>
      <section className="px-6 pb-28 pt-36 md:px-[8vw] md:pt-44">
        <Reveal>
          <p className="mb-4 text-[11px] uppercase tracking-widest2 text-warm-500">CONTACT</p>
          <h1 className="text-4xl font-extralight tracking-wide md:text-5xl">{t.contact.title}</h1>
          <p className="mt-4 text-sm font-light text-warm-500">{t.contact.sub}</p>
        </Reveal>

        <div className="mt-16 grid gap-16 lg:grid-cols-2 lg:gap-[6vw]">
          {/* ฟอร์ม */}
          <Reveal>
            <form onSubmit={handleSubmit} noValidate className="relative space-y-7">
              <div>
                <label htmlFor="name" className={caption}>
                  {t.contact.name}
                </label>
                <input id="name" name="name" required maxLength={100} autoComplete="name" className={field} />
              </div>
              <div>
                <label htmlFor="email" className={caption}>
                  {t.contact.email}
                </label>
                <input id="email" name="email" required maxLength={200} autoComplete="email" className={field} />
              </div>
              <div>
                <label htmlFor="message" className={caption}>
                  {t.contact.message}
                </label>
                <textarea id="message" name="message" required maxLength={2000} rows={5} className={`${field} resize-none`} />
              </div>
              {/* ช่องดักบอท: คนมองไม่เห็นและ Tab ไปไม่ถึง บอทที่กรอกทุกช่องจะกรอกช่องนี้ */}
              <div aria-hidden className="absolute -left-[9999px] top-0 h-px w-px overflow-hidden">
                <label htmlFor="website">Website</label>
                <input id="website" name="website" tabIndex={-1} autoComplete="off" />
              </div>
              <p role="alert" className="min-h-5 text-[13px] font-light text-[#9f2d20]">
                {error && t.contact.errors[error]}
              </p>
              <button
                type="submit"
                disabled={busy}
                className="border border-ink px-10 py-4 text-[11px] uppercase tracking-widest2 transition-colors duration-300 hover:bg-ink hover:text-paper disabled:opacity-50"
              >
                {busy ? t.contact.sending : t.contact.send}
              </button>
            </form>
          </Reveal>

          {/* ข้อมูล + แผนที่ */}
          <Reveal delay={0.15}>
            <address className="mb-8 space-y-2.5 text-sm font-light not-italic leading-relaxed text-stone-600">
              <p>{lang === 'th' ? CONTACT.address_th : CONTACT.address_en}</p>
              <p>{CONTACT.phone} · LINE {CONTACT.line}</p>
              <p>{CONTACT.email}</p>
              <p>{lang === 'th' ? CONTACT.hours_th : CONTACT.hours_en}</p>
            </address>
            <Placeholder label="แผนที่ Google Maps (ฝังของจริงตรงนี้)" ratio="16/9" />
          </Reveal>
        </div>
      </section>

      {/* Toast */}
      <div
        role="status"
        aria-live="polite"
        className={`fixed bottom-8 left-1/2 z-[70] w-[calc(100%-3rem)] max-w-md -translate-x-1/2 border border-ink/10 bg-ink px-6 py-4 text-center text-[13px] font-light text-paper shadow-2xl transition-all duration-500 ${
          toast ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-6 opacity-0'
        }`}
      >
        {t.contact.toast}
      </div>
    </>
  );
}
```

- [ ] **Step 6: Admin inbox**

Create `app/admin/(panel)/inquiries/actions.ts`:

```ts
'use server';

import { adminAction } from '@/lib/admin';
import { audit } from '@/lib/server/audit';
import { markHandled } from '@/lib/server/inquiries';

// ผ่าน adminAction: ตรวจ session แล้วรันการแก้กับ audit ใน transaction เดียว · ไม่ใส่ข้อความของลูกค้าใน audit
export async function markHandledAction(id: number) {
  return adminAction(async (tx, a) => {
    await markHandled(tx, id);
    await audit(tx, a.id, 'handle', 'inquiry', id);
  });
}
```

Create `app/admin/(panel)/inquiries/page.tsx`:

```tsx
import type { Metadata } from 'next';
import InquiriesAdmin from '@/components/admin/InquiriesAdmin';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/admin';
import { listInquiries } from '@/lib/server/inquiries';

export const metadata: Metadata = { title: 'ข้อความติดต่อ' };

export default async function AdminInquiriesPage() {
  await requireAdmin();
  return <InquiriesAdmin items={await listInquiries(db)} />;
}
```

In `components/admin/AdminShell.tsx`, replace
```tsx
  { href: '/admin/projects/', label: 'ผลงาน', icon: 'house', bar: true },
```
with
```tsx
  { href: '/admin/projects/', label: 'ผลงาน', icon: 'house', bar: true },
  { href: '/admin/inquiries/', label: 'ข้อความติดต่อ', icon: 'mail', bar: true },
```

Create `components/admin/InquiriesAdmin.tsx`:

```tsx
'use client';

// หลังบ้าน: ข้อความจากฟอร์มติดต่อ ใหม่สุดก่อน · ยังไม่มีอีเมลแจ้ง (SMTP ทำรอบถัดไป) ต้องเข้ามาดูที่นี่
// ข้อความยาวหลายบรรทัด จึงเป็นการ์ดทุกขนาดจอ ไม่ทำเป็นแถวตั้งแต่ lg แบบหน้าอื่น
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { AdminInquiry } from '@/lib/server/inquiries';
import { markHandledAction } from '@/app/admin/(panel)/inquiries/actions';
import { ghost } from './ui';

export default function InquiriesAdmin({ items }: { items: AdminInquiry[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<number | null>(null);
  const [msg, setMsg] = useState('');
  const waiting = items.filter((x) => !x.handled).length;

  async function done(x: AdminInquiry) {
    setBusy(x.id);
    try {
      const r = await markHandledAction(x.id);
      setMsg(r.ok ? `ทำเครื่องหมายข้อความของ ${x.name} ว่าจัดการแล้ว` : r.error);
      if (r.ok) router.refresh();
    } catch {
      setMsg('บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง');
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <header className="glass rounded-[28px] p-5 md:p-6">
        <h1 className="text-2xl font-extralight tracking-wide md:text-3xl">ข้อความติดต่อ</h1>
        <p className="mt-1 text-sm text-stone-600">
          ยังไม่จัดการ {waiting} จากทั้งหมด {items.length} ข้อความ · ยังไม่มีอีเมลแจ้ง เข้ามาดูที่หน้านี้
        </p>
      </header>
      <div role="status" className="min-h-6 px-2 text-sm text-ink">
        {msg}
      </div>
      {items.length === 0 ? (
        <div className="glass rounded-[28px] px-6 py-14 text-center text-sm">ยังไม่มีข้อความ</div>
      ) : (
        <ul className="grid gap-3 xl:grid-cols-2">
          {items.map((x) => (
            <li key={x.id} className="glass rounded-[24px] p-4 md:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm">{x.name}</p>
                  <p className="break-all text-xs text-stone-600">
                    {x.email} · {x.created}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-3 py-1 text-xs ${x.handled ? 'border border-ink text-ink' : 'bg-ink text-paper'}`}>
                  {x.handled ? 'จัดการแล้ว' : 'ใหม่'}
                </span>
              </div>
              <p className="mt-3 whitespace-pre-wrap break-words text-sm">{x.message}</p>
              {!x.handled && (
                <button type="button" className={`${ghost} mt-3 bg-white/60`} disabled={busy !== null} onClick={() => done(x)}>
                  {busy === x.id ? 'กำลังบันทึก' : 'ทำเครื่องหมายว่าจัดการแล้ว'}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
```

- [ ] **Step 7: Typecheck**

```bash
npx tsc --noEmit 2>&1 | grep -v '\.next/types'
grep -n 'เดโม่\|Demo only' lib/i18n.ts components/ContactContent.tsx
```
Expected: both print nothing.

- [ ] **Step 8: Verify in the browser, deciding from the database**

Run Q0 and Q1. `PSQL="psql -h localhost -p 5433 -d iterra_dev -At"`. All test messages use the email `qa-inquiry@iterra.test` or `0812345678` so they can be found and removed. Requests from this machine share one salted IP (`local`), so the limit counts them together. First make sure no recent row would skew it: `$PSQL -c "select count(*) from inquiries where created_at > now() - interval '10 minutes'"` prints `0` (if not, wait 10 minutes).

1. `/contact/` in Thai: press ส่งข้อความ with all fields empty. The alert shows `กรุณากรอกชื่อ ไม่เกิน 100 ตัวอักษร`; `$PSQL -c "select count(*) from inquiries where email = 'qa-inquiry@iterra.test'"` prints `0`.
2. Fill name `QA ทดสอบ`, email `qa-inquiry@iterra.test`, message `ทดสอบฟอร์ม บรรทัดแรก` and a second line, send. The toast `ส่งข้อความเรียบร้อย เราจะติดต่อกลับภายใน 24 ชม.` appears and the form clears. The count above prints `1`; `$PSQL -c "select emailed_at is null, handled_at is null from inquiries where email = 'qa-inquiry@iterra.test'"` prints `t|t`.
3. Honeypot: fill the form again with the same email, then `evaluate_script` `() => { document.getElementById('website').value = 'http://spam.example'; }`, send. The toast appears, the count still prints `1`.
4. Phone: send with email field `0812345678`. `$PSQL -c "select count(*) from inquiries where email = '0812345678'"` prints `1`.
5. Limit: send once more with `qa-inquiry@iterra.test` (3rd stored row in 10 minutes), then once more: the alert shows `ส่งหลายครั้งเกินไป ลองใหม่อีกครั้งในอีก 10 นาที`; total test rows `$PSQL -c "select count(*) from inquiries where email in ('qa-inquiry@iterra.test', '0812345678')"` prints `3`.
6. Switch to English, send empty: the alert shows `Please enter your name, up to 100 characters`.
7. `/admin/inquiries/` lists the 3 test messages first, newest first, each `ใหม่`, with line breaks kept. At 375 px the bottom bar shows 4 icons plus the person icon and nothing overflows. Press ทำเครื่องหมายว่าจัดการแล้ว on the newest: DB `$PSQL -c "select count(*) from inquiries where email in ('qa-inquiry@iterra.test', '0812345678') and handled_at is not null"` prints `1`; audit for the QA user ends with `handle|inquiry`.
8. `list_console_messages` (errors only) prints nothing on `/contact/` and `/admin/inquiries/`.

Clean up the test rows, then run Q2:
```bash
psql -h localhost -p 5433 -d iterra_dev -v ON_ERROR_STOP=1 -Atc "delete from inquiries where email in ('qa-inquiry@iterra.test', '0812345678')"
```

- [ ] **Step 9: Gates, commit and push**

```bash
npx tsc --noEmit 2>&1 | grep -v '\.next/types'
npm run check:db && npm run check:filter && npm run check:search
npm run build
npm run check:overflow
git add lib/server/inquiries.ts app/contact/actions.ts components/ContactContent.tsx lib/i18n.ts 'app/admin/(panel)/inquiries' components/admin/InquiriesAdmin.tsx components/admin/AdminShell.tsx scripts/check-db.mjs
npm run check:text
git commit -m "feat: store contact form messages and read them in an admin inbox" && git push
```

---

### Task 6: Anonymous search query log

**Files:**
- Create: `db/migrations/003_search_queries.sql`, `lib/server/search-log.ts`, `app/search-log-action.ts`
- Modify: `components/SearchPanel.tsx`, `components/PrivacyContent.tsx`
- Test: `scripts/check-db.mjs`

**Interfaces:**
- Consumes: `useCatalog()` with `products`, `posts`, `projects` (Tasks 2 and 3); `search(index, query)` from `lib/search.ts`.
- Produces: table `search_queries (day, query, searches, clicks, zero_results)`; `normalizeQuery(q: unknown): string | null`, `MAX_DAILY_QUERIES = 5000`, `logSearch(db, q, clicked: boolean, results: number, cap = MAX_DAILY_QUERIES): Promise<boolean>` in `lib/server/search-log.ts`; public Server Function `logSearchAction(query, clicked, results): Promise<void>` in `app/search-log-action.ts`.
- Decision recorded in spec section 11.2: logged for every visitor without a consent gate, because rows are anonymous daily aggregates with no IP, session or cookie.

- [ ] **Step 1: Write the failing test**

In `scripts/check-db.mjs`, replace
```js
import { migrate } from './db-migrate.mjs';
```
with
```js
import { migrate } from './db-migrate.mjs';
import * as slog from '../lib/server/search-log.ts';
```

Replace
```js
  assert.deepEqual(await migrate(c), ['001_init.sql', '002_audit_session_idle.sql']);
```
with
```js
  assert.deepEqual(await migrate(c), ['001_init.sql', '002_audit_session_idle.sql', '003_search_queries.sql']);
```

Replace
```js
    'materials', 'posts', 'products', 'project_products', 'projects', 'schema_migrations', 'sessions',
```
with
```js
    'materials', 'posts', 'products', 'project_products', 'projects', 'schema_migrations', 'search_queries', 'sessions',
```

Replace
```js
  console.log('ผ่าน: ฐานข้อมูล');
```
with
```js
  // ── สถิติคำค้น (แผน 2 Task 6) ──
  {
    const N = slog.normalizeQuery;
    assert.equal(N('  Elate   SINK '), 'elate sink');
    assert.equal(N('ซิงก์'), 'ซิงก์');
    assert.equal(N('KOHLER 2026'), 'kohler 2026');
    assert.equal(N('1234567'), '1234567', '7 หลักยังเก็บได้ เช่นรหัสรุ่น');
    assert.equal(N('x'.repeat(70)).length, 60);
    // สั้นเกิน ว่าง ไม่ใช่ข้อความ ไม่เก็บ
    assert.equal(N('a'), null);
    assert.equal(N('   '), null);
    assert.equal(N(42), null);
    assert.equal(N(null), null);
    // ข้อมูลส่วนบุคคลไม่เก็บ: อีเมล เบอร์โทร เลขยาว (ทั้งเลขอารบิกและเลขไทย)
    assert.equal(N('me@example.com'), null);
    assert.equal(N('ติดต่อ somchai@mail.co.th'), null);
    assert.equal(N('0812345678'), null);
    assert.equal(N('081 234 5678'), null);
    assert.equal(N('081-234-5678'), null);
    assert.equal(N('๐๘๑๒๓๔๕๖๗๘'), null);
    assert.equal(N('<script>'), null);

    const day = (await c.query("select (now() at time zone 'Asia/Bangkok')::date::text as d")).rows[0].d;
    const row = async (q) =>
      (await c.query('select searches, clicks, zero_results from search_queries where day = $1 and query = $2', [day, q])).rows[0];
    // กดผล = ค้น 1 กด 1 · ปิดแผงโดยไม่กด = ค้น 1 (ไม่พบผล 1 เมื่อผลเป็น 0)
    assert.equal(await slog.logSearch(c, 'Elate', true, 3), true);
    assert.equal(await slog.logSearch(c, ' elate ', false, 3), true);
    assert.equal(await slog.logSearch(c, 'zzqq', false, 0), true);
    assert.deepEqual(await row('elate'), { searches: 2, clicks: 1, zero_results: 0 });
    assert.deepEqual(await row('zzqq'), { searches: 1, clicks: 0, zero_results: 1 });
    assert.equal(await slog.logSearch(c, 'me@example.com', false, 0), false);
    assert.equal(await count("search_queries where query like '%@%'"), 0);
    // ตารางไม่มีคอลัมน์ที่ระบุตัวคน
    const cols = (
      await c.query("select column_name from information_schema.columns where table_name = 'search_queries' order by ordinal_position")
    ).rows.map((r) => r.column_name);
    assert.deepEqual(cols, ['day', 'query', 'searches', 'clicks', 'zero_results']);
    // เพดานคำใหม่ต่อวัน: คำที่มีแล้วยังนับต่อ คำใหม่ไม่เพิ่มแถว
    assert.equal(await count(`search_queries where day = '${day}'`), 2);
    assert.equal(await slog.logSearch(c, 'brand new', false, 1, 2), false, 'มี 2 คำแล้ว = เต็มเพดาน 2');
    assert.equal(await slog.logSearch(c, 'elate', false, 1, 2), true);
    assert.equal((await row('elate')).searches, 3);
  }
  console.log('ผ่าน: ฐานข้อมูล');
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm run check:db`
Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `lib/server/search-log.ts`.

- [ ] **Step 3: Write the migration and the module**

Create `db/migrations/003_search_queries.sql`:

```sql
-- 003: สถิติคำค้นในเว็บ ยอดรวมรายวันต่อคำ (แผน 2 Task 6 · spec หัวข้อ 11.2)
-- ไม่มีคอลัมน์ IP session หรือ cookie: ระบุตัวคนไม่ได้ จึงเก็บได้กับทุกคนโดยไม่ต้องขอความยินยอม
create table search_queries (
  day          date not null,
  query        text not null,
  searches     int not null default 0,
  clicks       int not null default 0,
  zero_results int not null default 0,
  primary key (day, query)
);
```

Create `lib/server/search-log.ts`:

```ts
// สถิติคำค้นในเว็บ: ยอดรวมรายวันต่อคำ ไม่มี IP session หรือ cookie (spec หัวข้อ 11.2)
// import ไม่มี เพื่อให้ scripts/check-db.mjs รันไฟล์นี้ด้วย Node ได้ตรง ๆ

type Db = { query(text: string, values?: unknown[]): Promise<{ rows: any[]; rowCount: number | null }> };

// ponytail: เพดานคำใหม่ต่อวัน กันบอทยิงคำสุ่มจนตารางโต · คำจริงต่อวันเกินนี้เมื่อไรค่อยขยับ
export const MAX_DAILY_QUERIES = 5000;

// คืนคำที่จะเก็บ หรือ null = ไม่เก็บ
export function normalizeQuery(q: unknown): string | null {
  if (typeof q !== 'string') return null;
  const s = q.toLowerCase().trim().replace(/\s+/g, ' ');
  if (s.length < 2 || /[<>]/.test(s)) return null;
  // ดูเหมือนอีเมล หรือมีตัวเลขติดกันตั้งแต่ 8 หลัก (เบอร์โทร เลขบัตร เลขบัญชี) ไม่เก็บ · ตัดช่องว่างกับ - ก่อนนับ เบอร์ที่เว้นวรรคก็โดน
  if (/\S@\S/.test(s) || /[0-9๐-๙]{8,}/.test(s.replace(/[\s-]/g, ''))) return null;
  return s.slice(0, 60).trim();
}

// คืน true เมื่อนับแล้ว · clicked = กดผลค้นหา · results = จำนวนผลที่เห็นตอนนั้น
export async function logSearch(db: Db, q: unknown, clicked: boolean, results: number, cap = MAX_DAILY_QUERIES): Promise<boolean> {
  const query = normalizeQuery(q);
  if (!query) return false;
  const r = await db.query(
    `insert into search_queries (day, query, searches, clicks, zero_results)
     select t.day, $1::text, 1, $2::int, $3::int
       from (select (now() at time zone 'Asia/Bangkok')::date as day) t
      where exists (select 1 from search_queries where day = t.day and query = $1::text)
         or (select count(*) from search_queries where day = t.day) < $4::int
     on conflict (day, query) do update set
       searches = search_queries.searches + 1,
       clicks = search_queries.clicks + excluded.clicks,
       zero_results = search_queries.zero_results + excluded.zero_results`,
    [query, clicked ? 1 : 0, !clicked && results === 0 ? 1 : 0, cap],
  );
  return r.rowCount === 1;
}
```

- [ ] **Step 4: Run the test and watch it pass**

Run: `npm run check:db`
Expected: `ผ่าน: ฐานข้อมูล`

- [ ] **Step 5: Public Server Function, search panel and privacy text**

Create `app/search-log-action.ts`:

```ts
'use server';

import { db } from '@/lib/db';
import { logSearch } from '@/lib/server/search-log';

// นับคำค้นเป็นยอดรวมรายวัน ไม่เก็บ IP session หรือ cookie (spec หัวข้อ 11.2) · ไม่ต้องเข้าสู่ระบบ
// DB ล่มต้องไม่กระทบการค้นหา: จด error ไว้ที่ server แล้วจบเงียบ ๆ หน้าเว็บก็ไม่รอผล
export async function logSearchAction(query: string, clicked: boolean, results: number): Promise<void> {
  try {
    await logSearch(db, query, clicked === true, Number.isInteger(results) ? results : 0);
  } catch (e) {
    console.error('logSearch', e);
  }
}
```

Replace the whole of `components/SearchPanel.tsx` with:

```tsx
'use client';

// แผงค้นหาเต็มจอ: <dialog> แบบ modal (เบราว์เซอร์จัดการ focus, Escape และชั้นบนสุดให้)
// data-lenis-prevent: ไม่ให้ Lenis เลื่อนหน้าข้างหลังตอนเลื่อนผลค้นหา
// สถิติคำค้น: นับครั้งเดียวต่อการเปิดแผง ตอนกดผล หรือตอนปิดแผงโดยไม่กด · ส่งแล้วไม่รอผล ค้นหาทำในเบราว์เซอร์จึงใช้ได้แม้ DB ล่ม

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useLang } from './LangProvider';
import { buildIndex, search, GROUPS } from '@/lib/search';
import { PAGES } from '@/lib/i18n';
import { useCatalog } from './CatalogProvider';
import { logSearchAction } from '@/app/search-log-action';

export default function SearchPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { lang, t } = useLang();
  const ref = useRef<HTMLDialogElement>(null);
  const [query, setQuery] = useState('');
  const { products, posts, projects } = useCatalog();
  const index = useMemo(() => buildIndex({ products, posts, projects, pages: PAGES }), [products, posts, projects]);
  const results = useMemo(() => search(index, query), [index, query]);
  const logged = useRef(false);

  // ปิดแผงทุกทาง (Escape ปุ่มปิด กดผล) วิ่งผ่าน onClose ของ dialog · กดผลนับก่อนแล้ว ตอนปิดจึงไม่นับซ้ำ
  const report = (clicked: boolean) => {
    if (logged.current || query.trim() === '') return;
    logged.current = true;
    logSearchAction(query, clicked, results.length).catch(() => {});
  };

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      setQuery('');
      logged.current = false;
      d.showModal();
    } else if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      data-lenis-prevent
      onClose={() => {
        report(false);
        onClose();
      }}
      aria-label={t.search.open}
      className="m-0 h-dvh max-h-none w-screen max-w-none overflow-y-auto bg-ink p-0 text-paper"
    >
      <div className="flex items-center gap-4 px-6 py-5 md:px-[4vw]">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.search.placeholder}
          aria-label={t.search.open}
          className="h-12 min-w-0 flex-1 border-b border-paper/30 bg-transparent text-base font-extralight md:text-xl tracking-wide text-paper placeholder:text-paper/40 focus-visible:border-paper focus-visible:outline-none"
        />
        <button type="button" onClick={onClose} aria-label={t.search.close} className="flex h-11 w-11 items-center justify-center text-2xl font-extralight focus-visible:outline focus-visible:outline-1 focus-visible:outline-paper">
          ×
        </button>
      </div>
      <div className="px-6 pb-16 pt-4 md:px-[4vw]" aria-live="polite">
        {query.trim() === '' && <p className="text-sm font-light text-paper/60">{t.search.hint}</p>}
        {query.trim() !== '' && results.length === 0 && <p className="text-sm font-light text-paper/60">{t.search.none}</p>}
        {GROUPS.map((group) => {
          const items = results.filter((e) => e.group === group);
          if (items.length === 0) return null;
          return (
            <section key={group} className="mb-8">
              <h2 className="mb-2 text-[11px] font-normal uppercase tracking-widest2 text-paper/50">{t.search.groups[group]}</h2>
              <ul>
                {items.map((e) => (
                  <li key={e.href}>
                    <Link
                      href={e.href}
                      onClick={() => {
                        report(true);
                        onClose();
                      }}
                      className="flex min-h-11 items-center border-b border-paper/10 py-2 text-lg font-extralight tracking-wide hover:text-paper/70 focus-visible:outline focus-visible:outline-1 focus-visible:outline-paper"
                    >
                      {e.title[lang]}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </dialog>
  );
}
```

In `components/PrivacyContent.tsx`, replace
```tsx
ประเภทอุปกรณ์ และประเทศ โดยไม่ระบุตัวบุคคล'] },
```
with
```tsx
ประเภทอุปกรณ์ และประเทศ โดยไม่ระบุตัวบุคคล', 'เมื่อคุณใช้ช่องค้นหาในเว็บไซต์ เราเก็บคำค้นเป็นยอดนับรวมรายวันแบบไม่ระบุตัวบุคคล ไม่ผูกกับ IP คุกกี้ หรือตัวคุณ และไม่เก็บคำค้นที่ดูเหมือนอีเมลหรือเบอร์โทร เราใช้ยอดนี้ดูว่าผู้เข้าชมมองหาอะไร'] },
```
and replace
```tsx
It does not identify you.'] },
```
with
```tsx
It does not identify you.', 'When you use the site search, we keep anonymous daily counts of the search terms. They are not linked to your IP address, cookies or you, and terms that look like an email address or phone number are not kept. We use these counts to see what visitors look for.'] },
```

- [ ] **Step 6: Migrate the dev database, typecheck and verify in the browser**

```bash
npm run db:migrate
npx tsc --noEmit 2>&1 | grep -v '\.next/types'
```
Expected: `รันแล้ว: 003_search_queries.sql`; tsc prints nothing.

No admin login is needed. `PSQL="psql -h localhost -p 5433 -d iterra_dev -At"`, `TODAY="(now() at time zone 'Asia/Bangkok')::date"`. Record `$PSQL -c "select coalesce(sum(searches), 0) from search_queries where day = $TODAY and query in ('elate', 'qaprobe zz')"` (normally `0`).

1. On `/` open the search panel, type `Elate`, click the first product result. DB: `$PSQL -c "select searches, clicks, zero_results from search_queries where day = $TODAY and query = 'elate'"` prints `1|1|0` (plus what was recorded).
2. Open the panel, type `qaprobe zz` (no results), press Escape. DB for `qaprobe zz` prints `1|0|1`.
3. Open the panel, type `qa@example.com`, close with ×. `$PSQL -c "select count(*) from search_queries where query like '%@%'"` prints `0`.
4. Open the panel, type `0812345678`, close. `$PSQL -c "select count(*) from search_queries where query ~ '[0-9]{8}'"` prints `0`.
5. Open and close the panel without typing: no new row (`$PSQL -c "select count(*) from search_queries where day = $TODAY"` unchanged).
6. `/privacy/` shows the new sentence in Thai, and in English after switching language.
7. `list_console_messages` (errors only) prints nothing.

Not verified in the browser: search with the database down (the whole site reads the database in the root layout, so the page cannot load without it). The code path is covered by `logSearchAction` catching the error and the client ignoring the promise.

Clean up: `$PSQL -c "delete from search_queries where day = $TODAY and query in ('elate', 'qaprobe zz')"` (dev database only; these rows came from this test).

- [ ] **Step 7: Gates, commit and push**

```bash
npx tsc --noEmit 2>&1 | grep -v '\.next/types'
npm run check:db && npm run check:filter && npm run check:search
npm run build
npm run check:overflow
git add db/migrations/003_search_queries.sql lib/server/search-log.ts app/search-log-action.ts components/SearchPanel.tsx components/PrivacyContent.tsx scripts/check-db.mjs
npm run check:text
git commit -m "feat: count site search terms as anonymous daily totals" && git push
```

---

### Task 7: Retention prune script

**Files:**
- Create: `scripts/db-prune.mjs`
- Modify: `package.json` (script only)
- Test: `scripts/check-db.mjs`

**Interfaces:**
- Consumes: tables `login_attempts`, `sessions` (with `last_seen_at`), `audit_log`, `search_queries` (Tasks 1 and 6).
- Produces: `prune(client, idleMin = SESSION_IDLE_MIN or 120): Promise<{ loginAttempts: number; sessions: number; audit: number; searches: number }>` from `scripts/db-prune.mjs`; `npm run db:prune`.
- Retention (spec section 11.5): `login_attempts` 90 days, `sessions` expired or idle, `audit_log` 365 days, `search_queries` 400 days, `inquiries` never.

- [ ] **Step 1: Write the failing test**

In `scripts/check-db.mjs`, replace
```js
import { migrate } from './db-migrate.mjs';
```
with
```js
import { migrate } from './db-migrate.mjs';
import { prune } from './db-prune.mjs';
```

Replace
```js
  console.log('ผ่าน: ฐานข้อมูล');
```
with
```js
  // ── ล้างข้อมูลเก่า (แผน 2 Task 7) ──
  {
    const uid = (await c.query("select id::int as id from admin_users where email = 'admin@example.test'")).rows[0].id;
    await c.query(
      "insert into login_attempts (ip_hash, at) values ('prune-old', now() - interval '91 days'), ('prune-new', now() - interval '89 days')",
    );
    await c.query(
      `insert into sessions (token_hash, user_id, expires_at, last_seen_at) values
         ('prune-expired', $1, now() - interval '1 second', now()),
         ('prune-idle', $1, now() + interval '1 day', now() - interval '121 minutes'),
         ('prune-live', $1, now() + interval '1 day', now())`,
      [uid],
    );
    await c.query(
      `insert into audit_log (at, action, entity) values
         (now() - interval '366 days', 'prune-old', 'test'), (now() - interval '364 days', 'prune-new', 'test')`,
    );
    await c.query(
      "insert into search_queries (day, query, searches) values (current_date - 401, 'prune-old', 1), (current_date - 399, 'prune-new', 1)",
    );
    await c.query(
      "insert into inquiries (name, email, message, ip_hash, created_at) values ('เก่า', 'old@example.test', 'เก่ามาก', 'prune', now() - interval '1000 days')",
    );
    const r = await prune(c, 120);
    assert.ok(r.loginAttempts >= 1 && r.sessions >= 2 && r.audit >= 1 && r.searches >= 1, JSON.stringify(r));
    const left = async (sql) => (await c.query(sql)).rows.map((x) => Object.values(x)[0]).sort();
    assert.deepEqual(await left("select ip_hash from login_attempts where ip_hash like 'prune-%'"), ['prune-new']);
    assert.deepEqual(await left("select token_hash from sessions where token_hash like 'prune-%'"), ['prune-live']);
    assert.deepEqual(await left("select action from audit_log where action like 'prune-%'"), ['prune-new']);
    assert.deepEqual(await left("select query from search_queries where query like 'prune-%'"), ['prune-new']);
    assert.equal(await count("inquiries where ip_hash = 'prune'"), 1, 'ข้อความติดต่อไม่ลบ รอฝ่ายกฎหมาย');
    // รันซ้ำทันที ไม่มีอะไรให้ลบ
    assert.deepEqual(await prune(c, 120), { loginAttempts: 0, sessions: 0, audit: 0, searches: 0 });
  }
  console.log('ผ่าน: ฐานข้อมูล');
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm run check:db`
Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `scripts/db-prune.mjs`.

- [ ] **Step 3: Write the script**

Create `scripts/db-prune.mjs`:

```js
// ล้างข้อมูลเก่าตามระยะเก็บใน spec หัวข้อ 11.5: npm run db:prune (ตั้ง cron วันละครั้งบน server ตอน deploy)
// ไม่ลบข้อความจากฟอร์มติดต่อ: รอฝ่ายกฎหมายกำหนดระยะเก็บ
import { pathToFileURL } from 'node:url';
import pg from 'pg';

// client เป็น pg.Client, PoolClient หรือ Pool ก็ได้ (แต่ละคำสั่งไม่ต้องอยู่ transaction เดียวกัน)
export async function prune(client, idleMin = Math.floor(Number(process.env.SESSION_IDLE_MIN)) || 120) {
  const n = async (sql, values = []) => (await client.query(sql, values)).rowCount;
  return {
    loginAttempts: await n("delete from login_attempts where at < now() - interval '90 days'"),
    sessions: await n('delete from sessions where expires_at < now() or last_seen_at < now() - make_interval(mins => $1)', [idleMin]),
    audit: await n("delete from audit_log where at < now() - interval '365 days'"),
    searches: await n('delete from search_queries where day < current_date - 400'),
  };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const r = await prune(client);
    console.log(`ลบแล้ว: login_attempts ${r.loginAttempts}, sessions ${r.sessions}, audit_log ${r.audit}, search_queries ${r.searches}`);
  } finally {
    await client.end();
  }
}
```

In `package.json` `scripts`, replace
```json
    "db:disable-admin": "node --no-warnings --experimental-strip-types --env-file-if-exists=.env scripts/db-disable-admin.mjs"
```
with
```json
    "db:disable-admin": "node --no-warnings --experimental-strip-types --env-file-if-exists=.env scripts/db-disable-admin.mjs",
    "db:prune": "node --env-file-if-exists=.env scripts/db-prune.mjs"
```

- [ ] **Step 4: Run the test and watch it pass**

Run: `npm run check:db`
Expected: `ผ่าน: ฐานข้อมูล`

- [ ] **Step 5: Run it once on the dev database**

```bash
npm run db:prune
npm run db:prune
```
Expected: the first prints `ลบแล้ว: login_attempts N, sessions N, audit_log N, search_queries N` with whatever was old on `iterra_dev` (expired dev sessions are expected); the second prints all four as `0`. This touches only `iterra_dev`.

- [ ] **Step 6: Gates, commit and push**

```bash
npx tsc --noEmit 2>&1 | grep -v '\.next/types'
npm run check:db && npm run check:filter && npm run check:search
npm run build
git add scripts/db-prune.mjs package.json scripts/check-db.mjs
npm run check:text
git commit -m "feat: add a prune script for old logins, sessions, audit rows and search counts" && git push
```

---

## Not a task: admin pages in `check:overflow`

`scripts/check-overflow.mjs` crawls links from `/` with a headless Chrome and has no login. Covering `/admin/*` would mean logging in inside the script (a stored password or a forged session row), which is more than a cheap change, so it is skipped. Every admin screen in this plan is checked at 375 px and at desktop width in its task's browser step instead.

## After the last task

- `lib/posts.ts`, `lib/projects.ts`, `lib/catalog.ts` (`pages`, `pdfSizeMB`, `pdf`) stay: `db/seed.mjs`, `scripts/check-search.mjs` and `scripts/check-db.mjs` read them. Removing seed data is a file deletion that needs the lead.
- Page titles that name the edition (`แคตตาล็อก KOHLER Kitchens 2026`, `t.catalog.kicker`) are still code. A catalog of another year needs a text change, not only a new PDF.
- Deploy notes for DevOps (not this plan): nginx `client_max_body_size 31m`; `SESSION_IDLE_MIN` in the server `.env`; a daily cron for `npm run db:prune`; `npm run db:migrate` before `next start`.
- Report to the lead: the commits, what each browser step showed (with the database results), what was not verified (search log with the database down), and the decisions at the top of this plan that are still open.


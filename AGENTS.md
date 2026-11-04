<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->



<!-- BEGIN:project-coding-rules -->
<!-- PERMANENT: This block is project policy, not generated. Do NOT remove, shorten, or overwrite it when
     creating or updating an implementation plan, a task list, or any other document. Plans must comply
     with these rules; they must never replace them. Only edit this block when the user explicitly asks. -->

## Project Coding Rules (MTCNA Training)

These rules apply to every task, in every phase, for the whole life of the project.

### 1. Clean code and readability
- Write code that reads like prose. Prefer clarity over cleverness and brevity.
- Use descriptive, intention-revealing names (`calculateQuizScore`, not `calc` or `doIt`). No single-letter names except trivial loop indices. No unexplained abbreviations.
- Functions do **one thing**, stay short (aim for under ~30 lines), and take few parameters (use an object when more than 3).
- Use early returns and guard clauses. Avoid nesting deeper than 2–3 levels.
- No magic numbers or strings. Extract named constants (e.g. `TRYOUT_DURATION_MINUTES`, `PASSING_SCORE_PERCENT`, `QUESTION_COUNT`).
- Follow DRY, but do not abstract prematurely. Extract only when the same logic appears 3 times or the abstraction has a clear name.
- Remove dead code, unused imports, `console.log` debugging, and commented-out code before finishing.
- Keep files focused: one component or one responsibility per file. Split a file that grows beyond ~200 lines unless it is a data or type file.
- Comments explain **why**, not what. Never delete existing comments or docstrings that are unrelated to your change.

### 2. TypeScript
- `strict` mode stays on. **No `any`**. Use `unknown` plus narrowing, or proper types. No `@ts-ignore`; if unavoidable, use `@ts-expect-error` with a reason.
- Model domain concepts with explicit types: `Question`, `Topic`, `Attempt`, `Role`, `Language`. Prefer union literal types or enums over free strings.
- Validate all external input (forms, Server Actions, Route Handlers, env vars) with `zod`. Never trust the client.
- Prefer `type` imports (`import type { ... }`) and absolute imports through the `@/` alias.

### 3. Project structure and naming
- Follow the folder layout in the implementation plan: `app/` (routes only), `components/ui` (generic), `components/quiz` and other feature folders, `lib/` (logic, no JSX), `data/`, `scripts/`, `supabase/migrations/`.
- Keep route files (`page.tsx`, `layout.tsx`, `route.ts`) thin. Put logic in `lib/` and UI in `components/`.
- Naming: components `PascalCase.tsx`; hooks `useThing`; utilities and non-component files `kebab-case.ts`; constants `UPPER_SNAKE_CASE`; booleans start with `is/has/can/should`.
- Business rules (scoring, passing threshold, role checks) live in one place in `lib/` and are reused, never duplicated in components.

### 4. Next.js 16 and React
- Read the relevant guide in `node_modules/next/dist/docs/` before using any Next.js API (see the block above). `cacheComponents` is enabled: wrap dynamic data in `<Suspense>` or use `use cache` as the docs require. `middleware` is now `proxy.ts`. `params` is a Promise.
- Default to **Server Components**. Add `'use client'` only for state, effects, event handlers, or browser APIs, and keep client components small and at the leaves of the tree.
- Mutations go through Server Actions (validated with `zod`) or Route Handlers. Return typed results (`{ ok, error }`), never throw raw errors to the UI.
- Add `loading.tsx` and `error.tsx` where data loads. Handle empty, loading, and error states explicitly.
- Prefer composition over props drilling; keep components pure and presentational where possible.

### 5. Security (non-negotiable)
- Secrets (`SUPABASE_SERVICE_ROLE_KEY`, `AI_API_KEY`) are server-only: never use the `NEXT_PUBLIC_` prefix for them, never import them in client code, never log them, never commit `.env*`. Put `import 'server-only'` in modules that use them.
- Never ship answer keys or explanations to the client before they are allowed. Grade and enforce deadlines on the server.
- Authorization is enforced on the **server and in the database (RLS)**, never only by hiding UI. Every Server Action and Route Handler that is sensitive must verify the user and role first (`requireRole`). Read roles from the `profiles` table, never from `user_metadata`.
- Admin account rules: admins may create, reset the password of, and delete **participant** accounts, and may create new admin accounts. Admins must **never** delete an admin account or reset another admin's password. Users and admins may change their own password.
- Never print or store generated credentials in the repository, chat, or logs.

### 6. UI and UX
- The interface language is **Indonesian**. Quiz content (questions, options, explanations) is **bilingual: Indonesian and English**. Keep all UI strings in one place so they are easy to review.
- Visual style is **modern minimalist**: whitespace, neutral palette with one accent color, clean typography, subtle shadows, no clutter.
- Build reusable primitives in `components/ui` and use Tailwind design tokens. Do not scatter ad-hoc colors, spacing, or inline styles.
- Accessibility is required: semantic HTML, labels for inputs, visible focus, keyboard support, sufficient contrast, ARIA where needed. Layouts must be responsive (mobile first).

### 7. Database (Supabase)
- All schema changes are versioned SQL migrations in `supabase/migrations/`. Never change the schema by hand without a migration.
- Every table has RLS enabled with explicit policies. Use `is_admin()` and `auth.uid()` for checks.
- Seed and admin-bootstrap scripts live in `scripts/` and must be idempotent.

### 8. Quality gate (before saying a task is done)
- `npm run lint` and `npm run build` pass with no new warnings.
- Pure logic (scoring, validation, authorization helpers) has unit tests. Security rules (RLS, role checks, admin restrictions) are tested.
- Review your own diff for the rules above. Fix violations instead of noting them for later.
- Keep changes small and focused; do not mix refactors with feature work in one change. Use Conventional Commit messages (`feat:`, `fix:`, `refactor:`, `chore:`, `docs:`, `test:`).

### 9. Working agreements
- Do not start implementing until the user approves the plan. Follow the plan phase by phase and report what changed after each phase.
- When creating or updating any implementation plan, **keep this block intact** and add a "Compliance with project rules" note to the plan rather than copying or replacing these rules.
- If a requirement conflicts with these rules, stop and ask the user instead of silently breaking a rule.
- Respond to the user in Indonesian.

<!-- END:project-coding-rules -->
